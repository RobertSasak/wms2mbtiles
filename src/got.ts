import got from 'got'
import HttpAgent from 'agentkeepalive'
import isPng from 'is-png'

import isJpg from './isJpg.js'

const { HttpsAgent } = HttpAgent

const g = got.extend({
    agent: {
        http: new HttpAgent(),
        https: new HttpsAgent(),
    },
    resolveBodyOnly: true,
    responseType: 'buffer',
    timeout: {
        request: 40000,
    },
    retry: {
        limit: 2,
        statusCodes: [400, 408, 413, 429, 500, 502, 503, 504, 521, 522, 524],
    },
    hooks: {
        afterResponse: [
            (response, retry) => {
                const body = response.body as Buffer
                if (isPng(body) || isJpg(body)) {
                    return response
                }
                return retry({})
            },
        ],
    },
})

export default g
