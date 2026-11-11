type SignupConfig = { appId: string; configId: string; version: string; coexistence?: boolean };
type SignupAssets = { wabaId: string; phoneNumberId?: string };
type MetaClient = { init: (config: { appId: string; version: string; xfbml: boolean; cookie: boolean }) => void;
  login: (callback: (response: { authResponse?: { code?: string } }) => void, options: object) => void };
declare global { interface Window { FB?: MetaClient } }

// Asset IDs from the browser are hints. The server verifies the actual grant.
export function signupAssets(origin: string, value: unknown, coexistence = false): SignupAssets | null {
  if (!['https://www.facebook.com','https://web.facebook.com'].includes(origin)) return null;
  let data: unknown = value;
  try { if (typeof value === 'string') data = JSON.parse(value); } catch { return null; }
  const message = data as { type?: string; event?: string; data?: { waba_id?: string; phone_number_id?: string; is_on_biz_app?: boolean } } | null;
  if (message?.type !== 'WA_EMBEDDED_SIGNUP') return null;
  const finished = coexistence
    ? message.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' || (message.event === 'FINISH' && message.data?.is_on_biz_app === true)
    : message.event === 'FINISH' && message.data?.is_on_biz_app !== true;
  if (!finished) return null;
  const wabaId = message.data?.waba_id, phoneNumberId = message.data?.phone_number_id;
  if (typeof wabaId !== 'string' || !/^\d{1,64}$/.test(wabaId)) return null;
  if (typeof phoneNumberId === 'string' && /^\d{1,64}$/.test(phoneNumberId)) return { wabaId, phoneNumberId };
  // The coexistence completion event can contain only the WABA ID.
  return coexistence && phoneNumberId === undefined ? { wabaId } : null;
}

export async function loadMetaSignup(config: SignupConfig): Promise<MetaClient> {
  if (!window.FB) await new Promise<void>((resolve,reject) => {
    const existing = document.getElementById('huella-meta-sdk');
    if (existing) { reject(new Error('Recarga la página para reintentar la conexión.')); return; }
    const script = document.createElement('script'); script.id = 'huella-meta-sdk'; script.async = true;
    script.src = 'https://connect.facebook.net/es_LA/sdk.js'; script.referrerPolicy = 'strict-origin';
    const timeout = window.setTimeout(() => { script.remove(); reject(new Error('Meta no respondió. Recarga antes de reintentar.')); },15000);
    script.onload = () => { window.clearTimeout(timeout); resolve(); };
    script.onerror = () => { window.clearTimeout(timeout); script.remove(); reject(new Error('No se pudo abrir Meta.')); };
    document.head.appendChild(script);
  });
  if (!window.FB) throw new Error('Meta no está disponible.');
  window.FB.init({ appId: config.appId, version: config.version, xfbml: false, cookie: false });
  return window.FB;
}

export function runMetaSignup(client: MetaClient, config: SignupConfig, signal: AbortSignal): Promise<SignupAssets & { code: string }> {
  return new Promise((resolve,reject) => {
    let assets: ReturnType<typeof signupAssets> = null, code: string | null = null;
    const finish = (error?: Error) => {
      if (!error && (!assets || !code)) return;
      window.clearTimeout(timeout); window.removeEventListener('message',message); signal.removeEventListener('abort',abort);
      if (error) reject(error); else resolve({ ...assets!, code: code! });
    };
    const message = (event: MessageEvent) => { if (!event.source || event.source === window) return; const value = signupAssets(event.origin,event.data,config.coexistence); if (value) { assets = value; finish(); } };
    const abort = () => finish(new Error('Conexión interrumpida. Consulta el estado antes de repetir.'));
    const timeout = window.setTimeout(() => finish(new Error(config.coexistence
      ? 'Meta no confirmó la conexión con WhatsApp Business. Revisa el estado antes de reintentar.'
      : 'Meta no confirmó el alta. Revisa el estado antes de reintentar.')), config.coexistence ? 540000 : 120000);
    window.addEventListener('message',message); signal.addEventListener('abort',abort,{ once: true });
    if (signal.aborted) { abort(); return; }
    try {
      client.login(response => { const result = response.authResponse?.code; if (!result) { finish(new Error('Conexión cancelada en Meta.')); return; } code = result; finish(); },
        { config_id: config.configId, response_type: 'code', override_default_response_type: true,
          extras: { setup: {}, sessionInfoVersion: '3', ...(config.coexistence ? { featureType: 'whatsapp_business_app_onboarding' } : {}) } });
    } catch { finish(new Error('No se pudo abrir la ventana de Meta.')); }
  });
}
