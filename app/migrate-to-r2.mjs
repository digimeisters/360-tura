import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const [key, ...val] = line.split('=');
      return [key.trim(), val.join('=').trim()];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = 'panoramas';

// Efikasna rekurzivna funkcija za pronalaženje svih fajlova u svim folderima
async function getAllFilesRecursive(folderPath = '') {
  let fileList = [];
  
  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folderPath, {
    limit: 500,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' }
  });

  if (error) {
    console.error('Greška pri listanju putanje "' + folderPath + '":', error.message);
    return fileList;
  }

  if (!data || data.length === 0) return fileList;

  for (const item of data) {
    const currentPath = folderPath ? folderPath + '/' + item.name : item.name;

    // U Supabase-u, ako objekt nema 'id' ili nema 'updated_at'/'metadata', to je folder. 
    // Ako ima veličinu (size) ili mimetype ili id, onda je fajl.
    const isFolder = !item.id || (item.id === null && !item.metadata);

    if (isFolder || (item.name && !item.name.includes('.'))) {
      // Rekurzivno ulazimo dublje u folder
      const subFiles = await getAllFilesRecursive(currentPath);
      fileList.push(...subFiles);
    } else {
      // Ovo je fajl
      if (item.name !== '.emptyFolderPlaceholder') {
        fileList.push(currentPath);
      }
    }
  }

  return fileList;
}

async function migrate() {
  console.log('Pokrećem pretragu i migraciju svih slika iz bucket-a "panoramas"...\n');

  // Alternativa: Ako Supabase vrati prazno zbog strukture, probaćemo direktno poznate foldere sa vaše slike
  let filePaths = await getAllFilesRecursive();

  // Ako i dalje iz nekog razloga vrati 0, ručno mapiramo foldere sa Vašeg ekrana da budemo 100% sigurni
  if (filePaths.length === 0) {
    console.log('Nema automatski detektovanih fajlova, proveravam poznate foldere (Toni, Maglićka, Proba Wien)...');
    const rootItems = ['Toni', 'Maglićka', 'Proba Wien'];
    for (const folder of rootItems) {
      const sub = await getAllFilesRecursive(folder);
      filePaths.push(...sub);
    }
    
    // Provera i za fajlove u root-u (ako ih ima)
    const { data: rootData } = await supabase.storage.from(BUCKET_NAME).list('', { limit: 100 });
    if (rootData) {
      for (const item of rootData) {
        if (item.id && item.name !== '.emptyFolderPlaceholder' && item.name.includes('.')) {
          filePaths.push(item.name);
        }
      }
    }
  }

  if (filePaths.length === 0) {
    console.log('❌ Ipak nisu pronađeni fajlovi u bucket-u. Proverite da li je naziv bucket-a tačan.');
    return;
  }

  // Uklanjamo eventualne duplikate
  filePaths = [...new Set(filePaths)];

  console.log('📦 Ukupno pronađeno fajlova za migraciju: ' + filePaths.length + '\n');

  for (const filePath of filePaths) {
    console.log('⏳ Preuzimam sa Supabase-a: ' + filePath + '...');

    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (downloadError) {
      console.error('❌ Greška pri preuzimanju ' + filePath + ':', downloadError.message);
      continue;
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('📤 Šaljem na Cloudflare R2: ' + filePath + '...');
    await r2.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: filePath,
        Body: buffer,
        ContentType: blob.type || 'image/webp',
      })
    );

    const newUrl = env.NEXT_PUBLIC_CDN_URL + '/' + filePath;
    console.log('✅ Uspešno! Novi URL: ' + newUrl + '\n');
  }

  console.log('🎉 Migracija svih fajlova je uspešno završena!');
}

migrate();