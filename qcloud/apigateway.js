const tencentcloud = require("tencentcloud-sdk-nodejs");
var config = require("../config");


let Apigateway = {
    listservices: function (id, fn) {
        let con = config.getConfigById(id)
        console.info(tencentcloud)
        const ApigatewayClient = tencentcloud.apigateway.v20180808.Client;
        const models = tencentcloud.apigateway.v20180808.Models;

        const Credential = tencentcloud.common.Credential;
        const ClientProfile = tencentcloud.common.ClientProfile;
        const HttpProfile = tencentcloud.common.HttpProfile;

        let cred = new Credential(con.id, con.key);
        let httpProfile = new HttpProfile();
        httpProfile.endpoint = "apigateway.tencentcloudapi.com";
        let clientProfile = new ClientProfile();
        clientProfile.httpProfile = httpProfile;
        let client = new ApigatewayClient(cred, con.project.region, clientProfile);

        let req = new models.DescribeServicesStatusRequest();

        let params = '{}'
        req.from_json_string(params);

        client.DescribeServicesStatus(req, function (errMsg, response) {

            if (errMsg) {
                fn(errMsg.getMessage())
                console.log(errMsg);
                return;
            }
            fn(response)
            console.log(response.to_json_string());
        });

    }
}


module.exports = Apigateway