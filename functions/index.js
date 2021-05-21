
/*
    @author kisookang
    @date 2021-05-21
    @email verynicesoo78@gmail.com
    @note exports.CallCredit => Http Post with body data(json)
*/

const functions = require('firebase-functions'); 
//const admin = require('firebase-admin');

const express = require('express'); 
const  HashMap  = require ( 'hashmap'); 
const urlencode = require('urlencode');

const syncrequest = require('sync-request')
const crypto = require('crypto');

/**************************************************
 * 고정값 정의 - 실서비스를 위해서는 반드시 교체 필요
 **************************************************/
 const CPID = "9810030929"; 
 const CRYPTOKEY = Buffer.from("20ad459ab1ad2f6e541929d50d24765abb05850094a9629041bebb726814625d", 'hex');
 const IVKEY = Buffer.from("d7d02c92cb930b661f107cb92690fc83", 'hex'); // IV 고정값.
 
 /**************************************************
  * danal 응답데이터를 파싱하여  key-value 배열로 리턴한다.
  **************************************************/
 function  str2data(qs) {
     const queryString = qs.substr(1);
     const chunks = qs.split('&');
 
     let result = {};
 
     chunks.forEach(chunk => {
         const [ key, value ] = chunk.split('=');
         var decoded = urlencode.decode(value,"EUC-KR");
         result[key] = decoded;
     });
     return result;
 }
 /**************************************************
  * request data를 url encode gkdu string 으로 리턴한다.
  **************************************************/
 function data2string(mapobj){
 
     let sb="";
 
     mapobj.forEach(function(value, key) {
         //console.log(key + " : " + value);
 
         sb += key;
         sb += '=';
         sb+= urlencode.encode(value);
         sb+='&';
     });
 
     return sb;
 }
/******************************************************
*  DN_CREDIT_URL	: 결제 서버 정의
******************************************************/
const DN_CREDIT_URL = 'https://tx-creditcard.danalpay.com/credit/';
const DN_CREDIT_URI = "credit/"

//admin.initializeApp();
const app = express();

exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

exports.CallCredit = functions.https.onRequest((request, response) => {
  functions.logger.info("calling function CallCredit!", {structuredData: true});
  postCallCredit(request,response,0);
});


app.get('/getMessage', (req, res) => { 
    if (Math.random() < 0.5) { res.send('World!'); } 
    else { 
    res.send('Hello!'); }
 }); 
 app.post('/dodanal', (req, res) => { 
        CallCredit(res,0);
 }); 
 app.post('/dodanalready',(req, res) => {
    postCallCredit(req,res,0);
 });

//const server = app.listen(process.env.PORT || '3000', () => { 
//    console.log('server listening on port %s', server.address().port); 
//}); 

// /api prefix를 가지는 요청을 express 라우터로 전달 
exports.api = functions.https.onRequest(app);


/*
    @author kisookang
    @date 2021-05-10
    @email verynicesoo78@gmail.com
    @note AES256/CBC Encryp / Decrypt => base64 encode/decode
*/


function getAlgorithm(ckey) {

    var key = ckey;
    switch (key.length) {
        case 32:
            return 'aes-128-cbc';
        case 64:
            return 'aes-256-cbc';

    }

    throw new Error('Invalid key length: ' + key.length);
};

function encrypt(plainText) {

    var key = CRYPTOKEY;//Buffer.from(keyBase64, 'base64');
    var iv = IVKEY;//Buffer.from(ivBase64, 'base64');

    var cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let cip = cipher.update(plainText, 'utf8', 'base64')
    cip += cipher.final('base64');
    return cip;
};


function  decrypt(messagebase64) {

    var key = CRYPTOKEY;//Buffer.from(keyBase64, 'base64');
    var iv = IVKEY;//Buffer.from(ivBase64, 'base64');

    var decipher = crypto.createDecipheriv('aes-256-cbc',key, iv);
    let dec = decipher.update(messagebase64, 'base64');
    dec += decipher.final('');
    return dec;
}

/* STEP 1* */
function readyData_for_request(){
    try{
        /******************************************************
         *  RETURNURL 	: CPCGI페이지의 Full URL
         *  CANCELURL 	: BackURL페이지의 Full URL
         ******************************************************/
        const RETURNURL = "http://your.domain/CPCGI.jsp";
        const CANCELURL = "http://your.domain/Cancel.jsp";

        const TEST_AMOUNT = "301";
        var  REQ_DATA  = new HashMap ( ) ; 
        /**************************************************
         * SubCP 정보
         **************************************************/
        REQ_DATA.set("SUBCPID", "");
        /**************************************************
         * 결제 정보
         **************************************************/
        REQ_DATA.set("AMOUNT", TEST_AMOUNT);
        REQ_DATA.set("CURRENCY", "410");
        REQ_DATA.set("ITEMNAME", "TestItem");
        REQ_DATA.set("USERAGENT", "WP");
        REQ_DATA.set("ORDERID", "Danal_202105141445436615376");
        REQ_DATA.set("OFFERPERIOD", "2015102920151129");
        /**************************************************
         * 고객 정보
         **************************************************/
        REQ_DATA.set("USERNAME", "kisookang");  // 구매자 이름
        REQ_DATA.set("USERID", "userid");       // 사용자 ID
        REQ_DATA.set("USEREMAIL", "useremail"); // 소보법 email수신처
        /**************************************************
         * URL 정보
         **************************************************/
        REQ_DATA.set("CANCELURL", CANCELURL);
        REQ_DATA.set("RETURNURL", RETURNURL);
        /**************************************************
         * 기본 정보
         **************************************************/
        REQ_DATA.set("TXTYPE", "AUTH");
        REQ_DATA.set("SERVICETYPE", "DANALCARD");
        REQ_DATA.set("ISNOTI", "N");
        REQ_DATA.set("BYPASSVALUE", "this=is;a=test;bypass=value"); 
        // BILL응답 또는 Noti에서 돌려받을 값. '&'를 사용할 경우 값이 잘리게되므로 유의.

        var cpdata = data2string(REQ_DATA);
        var cipherText = urlencode.encode(encrypt(cpdata));
        console.log(cipherText);
        return cipherText;

    } catch (error) {
    console.error(error);
    return "error";
  }
}
//step 2
function doReady(readyData){
    try{
        /**********************************************************
         * Request for Ready
         * aSync callback 방식으로 호출하고 싶으면 reqPost 함수를 호출한다. 
         * 단, Sync 시 복호화는 callback 에서 처리한다. 
         * 여기서는 순차적으로 진행되어야 하므로 SyncreqPostcp 함수를 사용한다.   
         * Sync Request Post
        ************************************************************/
         functions.logger.info("before SyncreqPost", {structuredData: true});
        var resData = SyncreqPost(CPID,readyData);
        functions.logger.info("after SyncreqPost!", {structuredData: true});
        functions.logger.info(resData, {structuredData: true});

        /**************************************************
         * 응답데이터 처리 
         * urldecode - DATA 값 획득 - 복호화 - base64decode  
        **************************************************/
        decodeCipherText = urlencode.decode(resData,'EUC-KR');
        const dataValue = decodeCipherText.split('=');
        var decryptedData = decrypt(dataValue[1]);

        //파라미터별 데이터 분리 후 UrlDecode
        var res = str2data(decryptedData);

        return res;

    } catch(error){
        console.error(error);
        return "error";
    }
}
/******************************************************
 *  Sync Request POST
 ******************************************************/
 function SyncreqPost(cpid, data){

    var res = syncrequest('POST', DN_CREDIT_URL +'?CPID=' + cpid + '&DATA=' + data)
  
    var resBody = res.getBody('utf-8');

    return resBody;
}

/**************************************************
 * danal 응답데이터를 파싱하여  key-value 배열로 리턴한다.
 **************************************************/
 async function CallCredit(res, isDebug) {
  
    try {       
        //step 1
        var req_enc_data = readyData_for_request();
        
        //step 2
        var result = doReady(req_enc_data);

        if(result["RETURNCODE"] == '0000')
        {
            console.log(result["RETURNMSG"]);
            console.log(result["STARTURL"]);
            console.log(result["TID"]);
            console.log(result["ORDERID"]);
            console.log(result["STARTPARAMS"])
            
            if(!isDebug)
                return successResponseWithReadyParams(res,result["STARTURL"],result["STARTPARAMS"]);
        }
        else{
            console.log(result["RETURNCODE"]);
            console.log(result["RETURNMSG"]);

            if(!isDebug)
                return validationErrorWithData(res,"RETURNMSG",result["RETURNMSG"]);
        }
   
        //step 3
        //var result = doReadyRedirect(result);

        return result;

    } catch (error) {
      console.error(error);
    }
  } 
/* STEP 1* */
function post_req_readyData(req){
    try{

        data = req.body.ready;
        //console.log(data);
        /******************************************************
         *  RETURNURL 	: CPCGI페이지의 Full URL
         *  CANCELURL 	: BackURL페이지의 Full URL
         ******************************************************/
        const RETURNURL = data.returnurl;
        const CANCELURL = data.cancelurl;

        const TEST_AMOUNT = "301";
        var  REQ_DATA  = new HashMap ( ) ; 
        /**************************************************
         * SubCP 정보
         **************************************************/
        REQ_DATA.set("SUBCPID", data.subcpid);
        /**************************************************
         * 결제 정보
         **************************************************/
        REQ_DATA.set("AMOUNT", data.amount);
        REQ_DATA.set("CURRENCY", data.currency);
        REQ_DATA.set("ITEMNAME", data.itemname);
        REQ_DATA.set("USERAGENT", data.useragent);
        REQ_DATA.set("ORDERID", data.orderid);
        REQ_DATA.set("OFFERPERIOD", data.offerperiod);
        /**************************************************
         * 고객 정보
         **************************************************/
        REQ_DATA.set("USERNAME", data.username);   // 구매자 이름
        REQ_DATA.set("USERID", data.userid);       // 사용자 ID
        REQ_DATA.set("USEREMAIL", data.useremail); // 소보법 email수신처
        /**************************************************
         * URL 정보
         **************************************************/
        REQ_DATA.set("CANCELURL", CANCELURL);
        REQ_DATA.set("RETURNURL", RETURNURL);
        /**************************************************
         * 기본 정보
         **************************************************/
        REQ_DATA.set("TXTYPE", "AUTH");
        REQ_DATA.set("SERVICETYPE", "DANALCARD");
        REQ_DATA.set("ISNOTI", "N");
        REQ_DATA.set("BYPASSVALUE", "this=is;a=test;bypass=value"); 
        // BILL응답 또는 Noti에서 돌려받을 값. '&'를 사용할 경우 값이 잘리게되므로 유의.

        var cpdata = data2string(REQ_DATA);
        var cipherText = urlencode.encode(encrypt(cpdata));

        return cipherText;

    } catch (error) {
    console.error(error);
    return "error";
  }
}
  /**************************************************
 * danal 응답데이터를 파싱하여  key-value 배열로 리턴한다.
 **************************************************/
async function postCallCredit(req, res, isDebug) {
  
    try {       
        //step 1       
        var req_enc_data = post_req_readyData(req);

        //step 2
        var result = doReady(req_enc_data);

        if(result["RETURNCODE"] == '0000')
        {
            console.log(result["RETURNMSG"]);
            console.log(result["STARTURL"]);
            console.log(result["TID"]);
            console.log(result["ORDERID"]);
            console.log(result["STARTPARAMS"])
        
            if(!isDebug)
                return successResponseWithReadyParams(res,result["STARTURL"],result["STARTPARAMS"]);
        }
        else{
            console.log(result["RETURNCODE"]);
            console.log(result["RETURNMSG"]);

            if(!isDebug)
                return validationErrorWithData(res,"RETURNMSG",result["RETURNMSG"]);
        }
   
        //step 3
        //var result = doReadyRedirect(result);

        return result;

    } catch (error) {
      console.error(error);
    }
  } 
  validationErrorWithData = function (res, msg, data) {
	var resData = {
		status: 0,
		message: msg,
		data: data
	};
	return res.status(400).json(resData);
};
function successResponsesendWithData (res, msg, data) {
	var resData = {
		status: 1,
		message: msg,
		data: data
	};
	return res.status(200).json(resData);
};
function successResponseWithReadyParams(res, param1, param2) {
	var resData = {
		status: 1,
		starturl: param1,
		startparams: param2
	};
	return res.status(200).json(resData);
};
