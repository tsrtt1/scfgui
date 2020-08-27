const tencentcloud = require("tencentcloud-sdk-nodejs");
const CONFIG = require("./config");
var readline = require('readline');

let ScfNet = {
  /**
   * 直接调用
   * ns 命名空间
   * @param {*} fun 函数名
   * @param {*} data 请求数据
   * cal 回调函数
   */
  dxInvode(ns, fun, data, cal) {
    let con = CONFIG.getChkConfig()
    const ScfClient = tencentcloud.scf.v20180416.Client;
    const models = tencentcloud.scf.v20180416.Models;
    const Credential = tencentcloud.common.Credential;
    const ClientProfile = tencentcloud.common.ClientProfile;
    const HttpProfile = tencentcloud.common.HttpProfile;

    let cred = new Credential(con.id, con.key);
    let httpProfile = new HttpProfile();
    httpProfile.endpoint = "scf.tencentcloudapi.com";
    let clientProfile = new ClientProfile();
    clientProfile.httpProfile = httpProfile;
    let client = new ScfClient(cred, con.project.region, clientProfile);
    let req = new models.InvokeRequest();

    let params = { FunctionName: fun, ClientContext: JSON.stringify(data), Namespace: ns }
    console.info(JSON.stringify(params))
    req.from_json_string(JSON.stringify(params));

    client.Invoke(req, function (errMsg, response) {

      if (errMsg) {
        cal(errMsg.message)
        return;
      }
      cal(response)
    });


  },


  //post调用
  postInvode(url, data, fn, contentType) {
    let para = data
    if (contentType == "application/json") {
      para = JSON.stringify(data)
    }

    $.ajax({
      url: url,
      method: "POST",
      dataType: 'json',
      headers: {
        'contentType': contentType
      },
      data: para,
      success: function (data) {
        console.info(data)
      },
      complete(res) {
        fn(res)
      }
    });
  },

  //获取scf对应的api网关url
  getFunctionUrl: function (fn) {
    let con = CONFIG.getChkConfig()
    let url = ""
    //从配置文件中拼接url
    for (let i = 0; i < con.functions.length; ++i) {
      if (con.functions[i].inputs.name == fn && con.functions[i].inputs.hasOwnProperty("events")) {
        for (let k = 0; k < con.functions[i].inputs.events.length; ++k) {
          if (con.functions[i].inputs.events[k].hasOwnProperty("apigw")) {
            url = "https://"
            url += con.functions[i].inputs.events[k].apigw.parameters.serviceId
            url = url + "-" + con.appid
            if (con.functions[i].inputs.region == "ap-guangzhou") {
              url += ".gz.apigw.tencentcs.com/" + con.functions[i].inputs.events[k].apigw.parameters.environment + con.functions[i].inputs.events[k].apigw.parameters.endpoints[0].path
            }
            return url
          }
        }
      }

    }
    return url
  },

  /**
   * 移除SCF
   * @param {*} fn 
   * @param {*} flushfn 
   * @param {*} finfn 
   */
  remove: function (fn, flushfn, finfn) {
    CONFIG.saveEnv()

    if (!CONFIG.saveFunctionToYml(fn)) {
      flushfn("未检索到改函数配置信息,无法删除")
      finfn()
      return
    }
    //

    var spawn = window.nodeRequire('child_process').spawn;
    free = spawn('serverless', ['remove', '--debug'], { cwd: __dirname, stdio: ['inherit'] });

    readline.createInterface({
      input: free.stdout,
      terminal: false
    }).on('line', function (line) {
      console.log("flush");
      line = line.replace("[22m", " ")
      line = line.replace("[1m", " ")
      line = line.replace("[J", " ")
      line = line.replace("[G", " ")
      line = line.replace("[32m", " ")
      line = line.replace("[39m", " ")
      flushfn(line)
    });

    free.on('exit', function (code, signal) {
      finfn()
    });

  },

  deploy: function (fn, flushfn, finfn) {
    CONFIG.saveEnv()
    CONFIG.saveFunctionToYml(fn)

    var spawn = window.nodeRequire('child_process').spawn;
    free = spawn('serverless', ['--debug'], { cwd: __dirname, stdio: ['inherit'] });

    readline.createInterface({
      input: free.stdout,
      terminal: false
    }).on('line', function (line) {
      console.log("flush");
      line = line.replace("[22m", " ")
      line = line.replace("[1m", " ")
      line = line.replace("[J", " ")
      line = line.replace("[G", " ")
      line = line.replace("[32m", " ")
      line = line.replace("[39m", " ")
      flushfn(line)
    });


    // 捕获标准输出并将其打印到控制台 
    // free.stdout.on('data', function (data) {
    //   let str = data.toString().split("\n")
    //   console.log(str);
    // });
    // 捕获标准错误输出并将其打印到控制台 
    // free.stderr.on('data', function (data) {
    //     console.log('standard error output:\n' + data);
    // });
    // 注册子进程关闭事件 
    free.on('exit', function (code, signal) {
      console.log('child process eixt ,exit:' + code);
      finfn()
    });
    return
  },

 

  //增加命名空间
  addNameSpace: function (name, fn) {
    let con = CONFIG.getChkConfig()
    const ScfClient = tencentcloud.scf.v20180416.Client;
    const models = tencentcloud.scf.v20180416.Models;
    const Credential = tencentcloud.common.Credential;
    const ClientProfile = tencentcloud.common.ClientProfile;
    const HttpProfile = tencentcloud.common.HttpProfile;

    let cred = new Credential(con.id, con.key);
    let httpProfile = new HttpProfile();
    httpProfile.endpoint = "scf.tencentcloudapi.com";
    let clientProfile = new ClientProfile();
    clientProfile.httpProfile = httpProfile;
    let client = new ScfClient(cred, con.project.region, clientProfile);
    let req = new models.CreateNamespaceRequest();
    let params = '{"Namespace":"' + name + '"}'
    req.from_json_string(params);
    client.CreateNamespace(req, function (errMsg, response) {
      if (errMsg) {
        dialog.showMessageBox({ type: "warning", message: "新增失败", detail: errMsg.message })
        console.log(errMsg.message);
        return;
      }
      dialog.showMessageBox({ type: "info", message: "新增完毕", detail: "新增命名空间成功" })
      fn()
      console.log(response.to_json_string());
    });

  },


  listNameSpace: function (fn) {
    let con = CONFIG.getChkConfig()

    const ScfClient = tencentcloud.scf.v20180416.Client;
    const models = tencentcloud.scf.v20180416.Models;

    const Credential = tencentcloud.common.Credential;
    const ClientProfile = tencentcloud.common.ClientProfile;
    const HttpProfile = tencentcloud.common.HttpProfile;

    let cred = new Credential(con.id, con.key);
    let httpProfile = new HttpProfile();
    httpProfile.endpoint = "scf.tencentcloudapi.com";
    let clientProfile = new ClientProfile();
    clientProfile.httpProfile = httpProfile;
    let client = new ScfClient(cred, con.project.region, clientProfile);

    let req = new models.ListNamespacesRequest();

    let params = '{}'
    req.from_json_string(params);

    client.ListNamespaces(req, function (errMsg, response) {
      if (errMsg) {
        console.log(errMsg);
        fn(errMsg.message)
        return;
      }
      fn(JSON.parse(response.to_json_string()))
    });
  },


  /**
   * 获取SDK使用的公共请求端
   */
  getSDKClient: function () {
    const ScfClient = tencentcloud.scf.v20180416.Client;
    const models = tencentcloud.scf.v20180416.Models;
    const Credential = tencentcloud.common.Credential;
    const ClientProfile = tencentcloud.common.ClientProfile;
    const HttpProfile = tencentcloud.common.HttpProfile;
    let con = CONFIG.getChkConfig()
    let cred = new Credential(con.id, con.key);
    let httpProfile = new HttpProfile();
    httpProfile.endpoint = "scf.tencentcloudapi.com";
    let clientProfile = new ClientProfile();
    clientProfile.httpProfile = httpProfile;
    let client = new ScfClient(cred, con.project.region, clientProfile);
    return {
      client: client,
      models: models
    }
  },

  /**
   * 查询执行日志
   * @param {object} reqpara 查询参数
   * @param {object} fn 回调函数
   */
  getFunctionLogs: function (reqpara, fn) {
    let sdkClient = this.getSDKClient()
    let req = new sdkClient.models.GetFunctionLogsRequest();

    let params = {}

    if(reqpara.hasOwnProperty("functionRequestId")&&reqpara.functionRequestId!=""){
      params.FunctionRequestId = reqpara.functionRequestId
    }else{
      if(reqpara.hasOwnProperty("limit")&&reqpara.limit!=""){
        params.Limit = reqpara.limit
      }else{
        params.Limit = 20
      }

      
      params.Offset = reqpara.offset
      // params.Namespace = reqpara.namespace

      if(reqpara.hasOwnProperty("namespace")&&reqpara.namespace!=""){
        params.Namespace = reqpara.namespace
      }

      if(reqpara.hasOwnProperty("functionName")&&reqpara.functionName!=""){
        params.FunctionName = reqpara.functionName
      }
      
      if(reqpara.hasOwnProperty("startTime")&&reqpara.startTime!=""){
        params.StartTime = reqpara.startTime.replace("T", " ")
      }

      if(reqpara.hasOwnProperty("endTime")&&reqpara.endTime!=""){
        params.EndTime = reqpara.endTime.replace("T", " ")
      }

      if(reqpara.hasOwnProperty("keyword")&&reqpara.keyword!=""){
        params.SearchContext = {Keyword:reqpara.keyword}
      }
      
      if(reqpara.hasOwnProperty("retCode")&&reqpara.retCode!=""){
        params.Filter = {RetCode:reqpara.retCode}
      }      
    }
    console.info(params)
    req.from_json_string(JSON.stringify(params));
    sdkClient.client.GetFunctionLogs(req, function (errMsg, response) {

      if (errMsg) {
        fn(errMsg.message)
        return;
      }
      fn(response)
    });

  },

  listFunction: function (fn, offset, limit, ns = "default") {

    let sdkClient = this.getSDKClient()
    let req = new sdkClient.models.ListFunctionsRequest();
    let params = {
      Orderby: "FunctionName",
      Limit: limit,
      Offset: offset,
      Namespace: ns
    }

    // '{"Orderby":"FunctionName","Limit":' + limit + ', "Offset":' + offset + '}'

    req.from_json_string(JSON.stringify(params));
    sdkClient.client.ListFunctions(req, function (errMsg, response) {

      if (errMsg) {
        fn(errMsg)
        return;
      }
      let res = JSON.parse(response.to_json_string());
      fn(res)
    });

  },



  getApiClient: function () {

  },

}


module.exports = ScfNet