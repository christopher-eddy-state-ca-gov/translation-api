const https = require( 'https' );
const cheerio = require( 'cheerio' );
const {google} = require('googleapis');


const setLangAttribute = (html) => {
};

let Logger = {};




const getApiKey = (conf) => {
  let key = '';
  if(!conf.GoogleDirect){
    key =  conf.CDTTranslationKey;
  }
  else{
    key =  conf.GoogleKey;
  }
  return key;
};

exports.createConnectionOption = (conf, _Logger) => {
  Logger = _Logger;
  return new Promise((resolve, reject) => {
   if(conf.GoogleDirect != 1){
      resolve({
          protocol: 'https:',
          method: 'POST',
          host: conf.CDTTranslationHost,
          path: `${conf.CDTTranslationPath}`,
          headers: {
          'Content-Type': 'application/json; charset=utf-8'
          }
      });
    }
    else{
      const key = getApiKey(conf);
      resolve({
        protocol: 'https:',
        method: 'POST',
        host: 'translation.googleapis.com',
        path: '/language/translate/v2',
        headers: {
          'Authorization': 'Bearer ' + key,
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
    }
  });
};

const DEFAULT_SELECTORS = ["body"];

const extractTexts = (html, conf) => {
  return new Promise((resolve, reject) => {
    try {
      const selectors = conf.translationSelectors || DEFAULT_SELECTORS;
      const $ = cheerio.load(html);
      const q = [];

      selectors.forEach((sel) => {
        let text = $(sel).html();
        Logger.log('Translate ' + sel + ' SIZE: ' + text ? text.length : 0);
        q.push(text);
      });
      resolve(q);
    }
    catch (err) {
      reject(err);
    }
  });
};

exports.replaceTexts = (html, translated, conf) => {
  return new Promise((resolve, reject) => {
    try {
      const selectors = conf.translationSelectors || DEFAULT_SELECTORS;
      const $ = cheerio.load(html);

      selectors.forEach((sel) => {
        $(sel).html(translated.shift().translatedText);
      });
      resolve($.html());
    }
    catch (err) {
      reject(err);
    }
  });
};

exports.createPostData = (html, lang, conf) => {
  return extractTexts(html, conf)
    .then((q) => {
      return {
      source: 'en',
      target: lang,
      format: 'html',
      q
      }
    })
};

/**
 * opts: conforms http.request, pointing to Google API endpoint
 * data: conforms Google Cloud Translation API post data
 */
exports.callTranslateApi = (opts, data, _Logger, conf) => {
  Logger = _Logger;
  return new Promise((resolve, reject) => {
    Logger.log(`TRANSLATE CALL API opts: ${JSON.stringify(opts)}`);
    const req = https.request(opts, (res) => {
      let body = '';

      res.on('error', (e) => {
        Logger.log('API RESPONSE ERROR');
        Logger.log(e);
        reject(e);
      });

      res.on('data', (chunk) => {
        Logger.log(`API RESPONSE DATA chunk: ${chunk}`);
        body += chunk;
      });

      res.on('end', (chunk) => {
         if (chunk) {
          body += chunk;
        }
        Logger.log(`body=${body}`);
        let json = JSON.parse(body);
        //HACK convert json to be google format from cdt format
        if(conf.GoogleDirect == "0"){
          const jsonNew = {};
          jsonNew["data"] = {};
          jsonNew["data"]["translations"] = json["data"];
          json = jsonNew;
        }

        if (json.data && json.data.translations) {
          return resolve(json.data.translations);
        }
        Logger.log('API REQUEST FAILED');
        if (json.error) {
          let err = json.error;
          Logger.log('Error Code: ' + err.code + ' Message: ' + err.message);
          //err.errors.forEach((e) => Logger.log(e));
        }
        return reject(json);
      });
    });

    req.on('error', (e) => {
      Logger.log('API REQUEST ERROR');
      Logger.log(e);
      reject(e);
    });
    Logger.log(`writing request ${JSON.stringify(data)}`)
    req.write(JSON.stringify(data), () => req.end());
  });
};

exports.Translate = (conf, Logger) => {
  return (html, lang, callback) => {
    Logger.log('Translate to LANG: ' + lang + ' SIZE: ' + html.length);
    let opts;
    let data;
    createConnectionOption(conf)
      .then((_opts) => opts = _opts)
      .then(() => createPostData(html, lang, conf))
      .then((_data) => data = _data)
      .then(() => callTranslateApi(opts, data, Logger, conf))
      .then((rslt) => replaceTexts(html, rslt, conf))
      .then((rslt) => callback(null, rslt))
      .catch((err) => callback(err));
  };
};

