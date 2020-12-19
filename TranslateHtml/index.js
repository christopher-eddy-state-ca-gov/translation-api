// const createHtmlPageTranslator = require('./page-translator.js');
const pageTranslateModule = require('./page-translator.js');

const createHtmlPageTranslator = pageTranslateModule.createHtmlPageTranslator;
const loadPage = pageTranslateModule.loadPage;

const sleep = async (millis) => {
    return new Promise(resolve => setTimeout(resolve, millis));
}

const getGoogleKeyFromEnv = () => {
    const gKey = {};
    Object.keys(process.env).forEach(key => {
        if(key.startsWith("key_")){
            gKey[key.replace("key_","")] = process.env[key];
        }
    });
    return gKey;
}

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    // const name = (req.query.name || (req.body && req.body.name));
    // const responseMessage = name
    //     ? "Hello, " + name + ". This HTTP triggered function executed successfully."
    //     : "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.";
 
    context.log(`typeof: ${typeof createHtmlPageTranslator }`);
    const html = req.body;

    process.env["targetLanguage"] = req.query.targetLanguage;
    process.env["GoogleDirect"] = req.query["GoogleDirect"] ? 1 : 0;
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