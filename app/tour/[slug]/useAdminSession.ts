import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

/**
 * Admin režim u turi. Pristup ide isključivo preko Supabase Auth sesije -
 * nema hardkodirane lozinke u URL-u. Ako je admin već ulogovan (na BILO
 * kojoj turi, ranije), sesija se automatski prepoznaje i ovde; ?admin=1
 * samo otvara prozor za prijavu kad sesije nema.
 */
export function useAdminSession() {
  const [adminMode, setAdminMode] = useState(false);
  // Ref za async kod (klik na tačku u panorami, v.on('mouseup')), gde bi
  // state bio "zaleđen" na vrednost iz trenutka pravljenja scene.
  const adminModeRef = useRef(false);
  // Otvoreno sa ?admin=1: ne pokazuj poruku o zaključanoj turi dok se ne zna
  // da li je prijava uspela - inače bi admin video kratak bljesak poruke
  // pre nego što se sesija prepozna.
  const [adminRequested, setAdminRequested] = useState(false);

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const requested = new URLSearchParams(window.location.search).get('admin') === '1';
    setAdminRequested(requested);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      const loggedIn = Boolean(session);
      setAdminMode(loggedIn);
      adminModeRef.current = loggedIn;
      if (!loggedIn && requested) setShowAdminLogin(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const loggedIn = Boolean(session);
      setAdminMode(loggedIn);
      adminModeRef.current = loggedIn;
      if (loggedIn) setShowAdminLogin(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword
    });

    setLoginLoading(false);

    if (authError) {
      setLoginError('Pogrešan email ili lozinka.');
      return;
    }

    // adminMode i showAdminLogin se ažuriraju automatski preko
    // onAuthStateChange listener-a gore.
    setLoginPassword('');
  };

  return {
    adminMode,
    adminModeRef,
    adminRequested,
    showAdminLogin,
    setShowAdminLogin,
    loginForm: {
      email: loginEmail,
      password: loginPassword,
      onEmail: setLoginEmail,
      onPassword: setLoginPassword,
      error: loginError,
      loading: loginLoading
    },
    handleAdminLogin
  };
}
