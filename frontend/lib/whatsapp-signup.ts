type SignupConfig = { appId: string; configId: string; version: string; coexistence?: boolean };
type SignupAssets = { wabaId: string; phoneNumberId?: string };
type MetaClient = { init: (config: { appId: string; version: string; xfbml: boolean; cookie: boolean }) => void;
  login: (callback: (response: { authResponse?: { code?: string } }) => void, options: object) => void;
  __buffer?: unknown };
declare global { interface Window { FB?: MetaClient; fbAsyncInit?: () => void } }

let metaClientPromise: Promise<MetaClient> | undefined;

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

function waitForMetaClient(): Promise<MetaClient> {
  if (window.FB && !window.FB.__buffer) return Promise.resolve(window.FB);
  if (metaClientPromise) return metaClientPromise;

  metaClientPromise = new Promise<MetaClient>((resolve, reject) => {
    const existing = document.getElementById('huella-meta-sdk');
    const script = document.createElement('script');
    script.id = 'huella-meta-sdk';
    script.async = true;
    script.src = 'https://connect.facebook.net/es_LA/sdk.js';
    script.referrerPolicy = 'strict-origin';

    const previous = window.fbAsyncInit;
    const cleanup = () => {
      window.clearTimeout(timeout);
      if (window.fbAsyncInit === ready) window.fbAsyncInit = previous;
      script.onerror = null;
    };
    const fail = (message: string) => {
      cleanup();
      script.remove();
      reject(new Error(message));
    };
    const ready = () => {
      const client = window.FB;
      if (!client || client.__buffer) return;
      cleanup();
      resolve(client);
      previous?.();
    };
    // sdk.js first installs a temporary buffer. Its load event can fire
    // before FB.login is available on the real SDK.
    const timeout = window.setTimeout(() => fail('Meta no terminó de cargar. Recarga la página antes de reintentar.'), 15000);
    window.fbAsyncInit = ready;
    script.onerror = () => fail('No se pudo cargar Meta. Reintenta la conexión.');
    if (!existing && !window.FB) document.head.appendChild(script);
  }).catch(error => {
    metaClientPromise = undefined;
    throw error;
  });
  return metaClientPromise;
}

export async function loadMetaSignup(config: SignupConfig): Promise<MetaClient> {
  const client = await waitForMetaClient();
  client.init({ appId: config.appId, version: config.version, xfbml: false, cookie: false });
  return client;
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
