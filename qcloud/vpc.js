const tencentcloud = require("tencentcloud-sdk-nodejs");
var config = require("../config");


let Vpc = {
    listapi:function(id){
        
        let con = config.getConfigById(id)
        const VpcClient = tencentcloud.vpc.v20170312.Client;
        const models = tencentcloud.vpc.v20170312.Models;
        const Credential = tencentcloud.common.Credential;
        const ClientProfile = tencentcloud.common.ClientProfile;
        const HttpProfile = tencentcloud.common.HttpProfile;
        let cred = new Credential(con.id, con.key);
        let httpProfile = new HttpProfile();
        httpProfile.endpoint = "apigateway.api.qcloud.com";
        let clientProfile = new ClientProfile();
        clientProfile.httpProfile = httpProfile;
        let client = new VpcClient(cred, con.project.region, clientProfile);

        let req = new models.DescribeSubnetsRequest();
       
        let params = '{}'
        req.from_json_string(params);
        client.DescribeSubnets(req, function (errMsg, response) {
            if (errMsg) {
                console.log(errMsg);
                return;
            }
            console.log(response.to_json_string());
        });
    },
    listsubnet: function (id) {
        let con = config.getConfigById(id)
        const VpcClient = tencentcloud.vpc.v20170312.Client;
        const models = tencentcloud.vpc.v20170312.Models;
        const Credential = tencentcloud.common.Credential;
        const ClientProfile = tencentcloud.common.ClientProfile;
        const HttpProfile = tencentcloud.common.HttpProfile;
        let cred = new Credential(con.id, con.key);
        let httpProfile = new HttpProfile();
        httpProfile.endpoint = "vpc.tencentcloudapi.com";
        let clientProfile = new ClientProfile();
        clientProfile.httpProfile = httpProfile;
        let client = new VpcClient(cred, con.project.region, clientProfile);

        let req = new models.DescribeSubnetsRequest();

        let params = '{}'
        req.from_json_string(params);
        client.DescribeSubnets(req, function (errMsg, response) {
            if (errMsg) {
                console.log(errMsg);
                return;
            }
            console.log(response.to_json_string());
        });

    },

    listvpc: function (id, fun) {
        let con = config.getConfigById(id)
        console.info(con)
        const VpcClient = tencentcloud.vpc.v20170312.Client;
        const models = tencentcloud.vpc.v20170312.Models;
        const Credential = tencentcloud.common.Credential;
        const ClientProfile = tencentcloud.common.ClientProfile;
        const HttpProfile = tencentcloud.common.HttpProfile;
        let cred = new Credential(con.id, con.key);
        let httpProfile = new HttpProfile();
        httpProfile.endpoint = "vpc.tencentcloudapi.com";
        let clientProfile = new ClientProfile();
        clientProfile.httpProfile = httpProfile;
        let client = new VpcClient(cred, con.project.region, clientProfile);
        let req = new models.DescribeVpcsRequest();
        let params = '{}'
        req.from_json_string(params);
        let bb = client.DescribeVpcs(req, function (errMsg, response) {
            console.info(errMsg, response)

            if (errMsg) {
                console.log(errMsg);
                fun(errMsg.getMessage())
                return;
            }
            // return response.VpcSet;
            //查询子网
            let vpcs = response.VpcSet

            let params = '{}'
            req.from_json_string(params);
            client.DescribeSubnets(req, function (errMsg, response) {
                if (errMsg) {
                    console.log(errMsg.getMessage());
                    return;
                }
                let subs = response.SubnetSet
                for(let i=0;i<vpcs.length;++i){
                    vpcs[i].subnet = []
                    for(let k=0;k<subs.length;++k){
                        if(vpcs[i].VpcId==subs[k].VpcId){
                            vpcs[i].subnet.push(subs[k])
                        }
                    }
                }
                fun(vpcs)
            });
        });
    }
}


module.exports = Vpc