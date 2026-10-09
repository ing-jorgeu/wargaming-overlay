const {ensureAssets}=require('../tts/kokoro-assets');
if(process.env.KOKORO_SKIP_DOWNLOAD!=='true')ensureAssets({log:console.log}).catch(e=>{console.warn('[Kokoro] '+e.message+' Se reintentará al leer el primer mensaje; el overlay puede seguir instalándose.');});
