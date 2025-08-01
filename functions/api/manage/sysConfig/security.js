export async function onRequest(context) {
    // 安全设置相关，GET方法读取设置，POST方法保存设置
    const {
      request, // same as existing Worker API
      env, // same as existing Worker API
      params, // if filename includes [id] or [[path]]
      waitUntil, // same as ctx.waitUntil in existing Worker API
      next, // used for middleware or to fetch assets
      data, // arbitrary space for passing data between middlewares
    } = context;

    const kv = env.img_url

    // GET读取设置
    if (request.method === 'GET') {
        const settings = await getSecurityConfig(kv, env)

        return new Response(JSON.stringify(settings), {
            headers: {
                'content-type': 'application/json',
            },
        })
    }

    // POST保存设置
    if (request.method === 'POST') {
        const body = await request.json()
        const settings = body

        // 写入 KV
        await kv.put('manage@sysConfig@security', JSON.stringify(settings))

        return new Response(JSON.stringify(settings), {
            headers: {
                'content-type': 'application/json',
            },
        })
    }

}

export async function getSecurityConfig(kv, env) {
    const settings = {}
    // 读取KV中的设置
    const settingsStr = await kv.get('manage@sysConfig@security')
    const settingsKV = settingsStr ? JSON.parse(settingsStr) : {}

    // 认证管理
    const kvAuth = settingsKV.auth || {}
    const auth = {
        user: {
            authCode: kvAuth.user?.authCode || env.AUTH_CODE || '',
        },
        admin: {
            adminUsername: kvAuth.admin?.adminUsername || env.BASIC_USER || '',
            adminPassword: kvAuth.admin?.adminPassword || env.BASIC_PASS || '',
        }
    }
    settings.auth = auth

    // 上传管理
    const kvUpload = settingsKV.upload || {}
    const upload = {
        moderate: {
            enabled: kvUpload.moderate?.enabled ?? true,
            channel: kvUpload.moderate?.channel || 'default', // [default, moderatecontent.com, nsfwjs]
            moderateContentApiKey: kvUpload.moderate?.moderateContentApiKey || kvUpload.moderate?.apiKey || env.ModerateContentApiKey || '',
            nsfwApiPath: kvUpload.moderate?.nsfwApiPath || '',
        }
    }
    settings.upload = upload

    // 访问管理
    const kvAccess = settingsKV.access || {}
    const access = {
        allowedDomains: kvAccess.allowedDomains || env.ALLOWED_DOMAINS || '',
        whiteListMode: kvAccess.whiteListMode ?? env.WhiteList_Mode === 'true',
    }
    settings.access = access

    // API Token 管理
    const kvApiTokens = settingsKV.apiTokens || {}
    const apiTokens = {
        tokens: kvApiTokens.tokens || {}
    }
    settings.apiTokens = apiTokens

    return settings;
}
