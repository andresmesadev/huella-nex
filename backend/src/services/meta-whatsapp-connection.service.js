const axios = require('axios');
const MATEOS_PET_COEXISTENCE_CONFIG_ID = '2337391527061790';
function providerError(code, status = 502) {
  const error = new Error(code); error.code = code; error.status = status; return error;
}
function buildMetaWhatsAppConnection({ http = axios, env = process.env, clock = () => new Date() } = {}) {
  const id = value => typeof value === 'string' && /^\d{1,64}$/.test(value);
  const digits = value => typeof value === 'string' ? value.replace(/\D/g, '') : '';
  function configuration(tenantId) {
    const coexistence = Boolean(env.WHATSAPP_COEXISTENCE_TENANT_ID && tenantId === env.WHATSAPP_COEXISTENCE_TENANT_ID);
    if (env.WHATSAPP_MULTITENANT_ENABLED !== 'true') throw providerError('COMMERCIAL_PROVIDERS_NOT_ENABLED', 503);
    if (!coexistence) {
      if (env.AI_QUOTA_ENABLED !== 'true') throw providerError('COMMERCIAL_PROVIDERS_NOT_ENABLED', 503);
      require('./ai-quota.service').aiQuotaPolicy(env);
    }
    const configId = coexistence ? MATEOS_PET_COEXISTENCE_CONFIG_ID : env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID;
    if (!id(env.WHATSAPP_APP_ID) || !id(configId) || !env.WHATSAPP_APP_SECRET ||
        (!coexistence && configId === MATEOS_PET_COEXISTENCE_CONFIG_ID) ||
        (coexistence && !/^[1-9]\d{6,14}$/.test(env.WHATSAPP_COEXISTENCE_PHONE ?? ''))) throw providerError('META_SIGNUP_NOT_CONFIGURED', 503);
    return { appId: env.WHATSAPP_APP_ID, configId, version: 'v25.0', ...(coexistence ? { coexistence } : {}) };
  }
  async function verify({ code, wabaId, phoneNumberId, tenantId }) {
    const config = configuration(tenantId);
    if (typeof code !== 'string' || !code || code.length > 10000 || !id(wabaId) ||
        (!(config.coexistence && phoneNumberId === undefined) && !id(phoneNumberId))) throw providerError('INVALID_META_AUTHORIZATION', 400);
    const base = `https://graph.facebook.com/${config.version}`;
    const options = token => ({ headers: { Authorization: `Bearer ${token}` }, timeout: 10000, maxRedirects: 0 });
    try {
      const exchange = await http.get(`${base}/oauth/access_token`, { params: { client_id: config.appId, client_secret: env.WHATSAPP_APP_SECRET, code }, timeout: 10000, maxRedirects: 0 });
      const token = exchange.data?.access_token;
      if (typeof token !== 'string' || !token) throw providerError('META_TOKEN_NOT_CONFIRMED');
      const debug = await http.get(`${base}/debug_token`, { ...options(`${config.appId}|${env.WHATSAPP_APP_SECRET}`), params: { input_token: token } });
      const grant = debug.data?.data;
      const now = Math.floor(+clock() / 1000);
      if (grant?.is_valid !== true || String(grant.app_id) !== config.appId ||
        !['whatsapp_business_management', 'whatsapp_business_messaging'].every(scope => grant.scopes?.includes(scope)) ||
        [grant.expires_at, grant.data_access_expires_at].some(value => value !== undefined && (!Number.isSafeInteger(value) || (value !== 0 && value <= now)))) throw providerError('META_PERMISSION_NOT_CONFIRMED', 403);
      // A scope name alone is insufficient: verify effective WABA membership.
      let phone = null, after;
      for (let page = 0; page < 10 && !phone; page++) {
        const response = await http.get(`${base}/${wabaId}/phone_numbers`, { ...options(token), params: { fields: 'id,display_phone_number,code_verification_status,platform_type', limit: 100, ...(after ? { after } : {}) } });
        if (!Array.isArray(response.data?.data)) throw providerError('META_ASSETS_NOT_CONFIRMED');
        phone = response.data.data.find(item => phoneNumberId
          ? item?.id === phoneNumberId
          : id(item?.id) && digits(item.display_phone_number) === env.WHATSAPP_COEXISTENCE_PHONE);
        const cursor = response.data.paging?.cursors?.after;
        if (!response.data.paging?.next || typeof cursor !== 'string' || cursor === after) break;
        after = cursor;
      }
      if (!phone || (!config.coexistence && (phone.code_verification_status !== 'VERIFIED' || phone.platform_type !== 'CLOUD_API'))) throw providerError('META_NUMBER_NOT_READY', 409);
      const verifiedPhoneNumberId = phone.id;
      if (config.coexistence) {
        const { data } = await http.get(`${base}/${verifiedPhoneNumberId}`, { ...options(token), params: { fields: 'is_on_biz_app,platform_type,display_phone_number' } });
        if (data?.id !== verifiedPhoneNumberId || data.is_on_biz_app !== true || data.platform_type !== 'CLOUD_API') throw providerError('META_COEXISTENCE_NOT_CONFIRMED', 409);
        if (digits(data.display_phone_number) !== env.WHATSAPP_COEXISTENCE_PHONE) throw providerError('META_COEXISTENCE_NUMBER_MISMATCH', 409);
        phone = data;
      }
      const subscription = await http.post(`${base}/${wabaId}/subscribed_apps`, {}, options(token));
      if (subscription.data?.success !== true) throw providerError('META_WEBHOOK_NOT_CONFIRMED');
      const expires = [grant.expires_at, grant.data_access_expires_at].filter(value => Number.isSafeInteger(value) && value > 0);
      return { token, wabaId, phoneNumberId: verifiedPhoneNumberId, displayPhone: typeof phone.display_phone_number === 'string' ? phone.display_phone_number.slice(0,64) : null,
        tokenExpiresAt: expires.length ? new Date(Math.min(...expires) * 1000) : null, ...(config.coexistence ? { manualOnly: true } : {}) };
    } catch (error) {
      // Axios errors can contain tokens, app secrets and authorization codes.
      if (typeof error.code === 'string' && error.code.startsWith('META_')) throw error;
      throw providerError('META_AUTHORIZATION_UNAVAILABLE');
    }
  }
  return { configuration, verify };
}
module.exports = { buildMetaWhatsAppConnection, providerError };
