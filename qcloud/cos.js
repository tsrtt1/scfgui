const COS = require("cos-nodejs-sdk-v5");
var config = require("../config");

let QcloudCos = {
    listBuck:function(fn){
        let con = config.getChkConfig()
        var cos = new COS({
            SecretId: con.id,
            SecretKey: con.key
        });
        cos.getService({
            Region: con.project.region,
          },function (err, data) {
              if(err!=null||err!=undefined){
                fn(err)
              }else{
                fn(data)
              }            
          });
    }
    
}

module.exports = QcloudCos