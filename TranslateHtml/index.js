// const createHtmlPageTranslator = require('./page-translator.js');
const pageTranslateModule = require('./page-translator.js');

const createHtmlPageTranslator = pageTranslateModule.createHtmlPageTranslator;
const loadPage = pageTranslateModule.loadPage;

const sleep = async (millis) => {
    return new Promise(resolve => setTimeout(resolve, millis));
}



module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
 
    const html = req.body;
    process.env["targetLanguage"] = req.query.targetLanguage;
    process.env["GoogleSecret"] = req.query["GoogleSecret"] ? req.query["GoogleSecret"] : '';

    const Translator = createHtmlPageTranslator(process.env, context);
    let translatedHtmlResponse = '';
    Translator.translatePage(
        html, 
        req.query.targetLanguage,
        (err, translatedHtml) => {
            context.log(`err: ${JSON.stringify(err)}`);
            context.log(`translatedHtml: ${translatedHtml}`);
            translatedHtmlResponse = translatedHtml || err;
        }
    )
    let cnt = 0;
    while(!translatedHtmlResponse && cnt < 100){
        await sleep(100);
        cnt++;
    }

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: translatedHtmlResponse
    };
}