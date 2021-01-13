const jwt = require('jsonwebtoken');
const https  = require( 'https');
const dotenv  = require( 'dotenv');

dotenv.config();
let access_token = '';
let expire_time = Date.now();

const sign =  (payload, privateKey,  kid, $Options) => {
  // Token signing options
  var signOptions = {
      issuer:  $Options.issuer,
      subject:  $Options.subject,
      audience:  $Options.audience,
      expiresIn:  "30m",    // 30 days validity
      algorithm:  "RS256",
      header: {kid}  
  };
   return jwt.sign(payload, privateKey, signOptions);
};

const getJwt = () => {
  const jwtOptions = {
    issuer: process.env["APP_GOOGLE_ISSUER"],
    subject: process.env["APP_GOOGLE_SUBJECT"],
    audience: process.env["APP_GOOGLE_AUDIENCE"]
  };
  const jwt = sign({
    scope: process.env["APP_GOOGLE_SCOPE"],
  }, process.env["APP_GOOGLE_PRIVATE_KEY"], process.env["APP_GOOGLE_PRIVATE_KEY_ID"], jwtOptions);

  return jwt;
};



exports.GetGoogleApiKey = (Logger) => {
  Logger.log(`access_token=${access_token}`);
  Logger.log(`Date.now=${Date.now()}`);
  Logger.log(`expire_time=${expire_time}`);
  const data = JSON.stringify({
    assertion: getJwt(),
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer'
  })
  Logger.log(`datafor getGoogleApiKey=${data}`);

  const options = {
    hostname: 'oauth2.googleapis.com',
    port: 443,
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }
  let token_string = '';

  return new Promise((resolve, reject) => {
    if (access_token && Date.now() < expire_time - 10000) {
      Logger.log(`reusing valid token which expires in ${(expire_time - Date.now()) / (1000 * 60)} minutes  time: ${new Date(expire_time)}`);
      return resolve(access_token);
    }
    const req = https.request(options, res => {
      res.on('data', d => {
        token_string = token_string + d;
      });
      res.on('end', d => {
        if (d) {
          token_string = token_string + d;
        }
        const token = JSON.parse(token_string);
        const expires_in = token['expires_in'];
        expire_time = Date.now() + (Number(expires_in) * 1000); 
        access_token = token['access_token'];
        return resolve(access_token);
      })
    })
    req.on('error', error => {
      Logger.error('GetAccessTokenError: ');
      Logger.error(error);
      return reject(error);
    });

    req.write(data);
    req.end();
  });
};

