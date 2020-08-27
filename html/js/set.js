const { dialog, shell } = window.nodeRequire('electron').remote

const tencentcloud = window.nodeRequire("tencentcloud-sdk-nodejs");
var fs = window.nodeRequire("fs");
var config = window.nodeRequire("../config");
var Vpc = window.nodeRequire("../qcloud/vpc.js");
var APIGATEWAY = window.nodeRequire("../qcloud/apigateway");


let app = new Vue({
    el: '#main',
    data: {
        appid: "",
        id: "",
        key: "",
        name: "",
        chkvpc: "",
        chksubnet: "",
        vpcs: [],
        subnets: [],
        vpcinfo: "",

        isloadvpc: true,
        scfs: [],

        showaddproject: true,
        shownetinfo: false,
        scf: {},

        isload: true,
        isloadapi: false,

        
        //选择的api网关服务id
        apigatewayid: "nosetapigateway",
        //当前账户下配置的api网关服务数量
        apigateways: [],
        //选择的api网关服务id
        chkapigateways:[],
        //api网关查询状态
        loadapigateway: false,
        //查询api网关失败后的错误信息
        apiwarninfo:""

    },
    mounted: function () {
        this.isload = false
    },
    created: function () {
        let scfs = config.getConfig()
        //showactive
        for (let i = 0; i < scfs.length; ++i) {
            delete scfs[i].showactive
        }
        this.scfs = scfs
    },

    watch: {
        chkvpc: function (n, o) {
            for (let i = 0; i < this.scfs.length; ++i) {
                if (this.scfs[i].showactive) {
                    this.scfs[i].project.vpcConfig.vpcId = n
                }
            }

            for (let i = 0; i < this.vpcs.length; ++i) {
                if (this.vpcs[i].VpcId == n) {
                    this.subnets = this.vpcs[i].subnet
                    return
                }
            }
        },

        chksubnet: function (n, o) {
            for (let i = 0; i < this.scfs.length; ++i) {
                if (this.scfs[i].showactive) {
                    this.scfs[i].project.vpcConfig.subnetId = n
                }
            }
            // this.saveproject()
        },
        scfs: {
            handler(newVal, objVal) {
                if (!this.isload) {
                    console.info("change profile")
                    this.saveproject()
                }

            },
            deep: true
        },


    },
    methods: {
        //切换api网关配置信息
        changeapigateway() {
            console.info("changeapigateway", this.apigatewayid)
            //选择"不设置api网关"
            if (this.apigatewayid == "nosetapigateway") {
                this.scf.project.apigw.isapi = "false"
                return
            }

            for (let i = 0; i < this.apigateways.length; ++i) {
                console.info(this.apigateways[i], this.apigateways[i].ServiceId)
                if (this.apigateways[i].ServiceId == this.apigatewayid) {
                    console.info(this.apigateways[i])
                    this.scf.project.apigw.serviceName = this.apigateways[i].ServiceName
                    this.scf.project.apigw.serviceId = this.apigateways[i].ServiceId
                    this.scf.project.apigw.isapi = "true"
                }
            }

        },

        hidvpc() {
            this.vpcinfo = ""
        },

        showvpc(scf) {
            this.vpcs = []
            this.subnets = []
            console.info("showvpc")
            this.isloadvpc = true
            Vpc.listvpc(scf.id, this.setvpc)
        },

        /**
         * 更新vpc网络配置信息
         * @param {更新} vpcs 
         */
        setvpc: function (vpcs) {
            console.info(vpcs)
            this.isloadvpc = false

            if (typeof (vpcs) == 'string') {

                UIkit.modal.dialog('<p class="uk-modal-body">' + vpcs + '!</p>');

                // dialog.showMessageBox({
                //     type: "none",
                //     detail: vpcs,
                //     message: "子网信息错误"
                // })
                this.vpcinfo = vpcs
                return
            }
            this.vpcs = vpcs
            //读取当前配置信息
            for (let i = 0; i < this.vpcs.length; ++i) {
                if (this.vpcs[i].VpcId == this.scf.project.vpcConfig.vpcId) {
                    this.subnets = this.vpcs[i].subnet
                }
            }


        },
        /**
         * 加载vpc配置信息
         */
        showvpcinfo: function () {
            this.shownetinfo = true
        },
        delexclude: function (inx) {
            this.scf.project.exclude.splice(inx, 1)
        },

        delinclude: function (inx) {
            this.scf.project.include.splice(inx, 1)
        },

        /**
         * 包含目录
         */
        addinclude: function () {
            let paths = dialog.showOpenDialogSync({
                properties: ['openDirectory']
            })
            let ps = this.scf.project.include
            let ex = false
            for (let i = 0; i < ps.length; ++i) {
                if (ps[i] == paths[0]) {
                    return
                }
            }
            this.scf.project.include.push(paths[0])
        },

        /**
         * 排除目录
         */
        addexclude: function () {
            let paths = dialog.showOpenDialogSync({
                properties: ['openDirectory']
            })
            if(paths==undefined){
                return
            }
            let ps = this.scf.project.exclude
            let ex = false
            //排除重复选择
            for (let i = 0; i < ps.length; ++i) {
                if (ps[i] == paths[0]) {
                    return
                }
            }
            this.scf.project.exclude.push(paths[0])
        },

        /**
         * 隐藏网络提示说明
         */
        hidvpcinfo: function () {
            this.shownetinfo = false
        },

        openfolder: function (path) {
            shell.showItemInFolder(path)
        },

        openurl: function (url) {
            shell.openExternal(url);
        },

        /**
         * 切换项目页面
         * @param {*} id 
         */
        changescf: function (id) {
            //"添加项目"UI设置隐藏状态
            this.showaddproject = false
            //清空api网关报警信息
            this.apiwarninfo = ""
            //初始化vpc配置信息
            this.vpcinfo = ""
            //初始化api网关为无选择
            this.apigatewayid = "nosetapigateway"

            for (let i = 0; i < this.scfs.length; ++i) {
                this.scfs[i].showactive = false
                if (this.scfs[i].id == id) {
                    this.scfs[i].showactive = true
                    this.scf = this.scfs[i]
                    this.vpcs = []
                    this.subnets = []

                    this.chkvpc = ""
                    this.chksubnet = ""
                    if (this.scfs[i].project.vpcConfig.hasOwnProperty("vpcId")) {
                        this.chkvpc = this.scfs[i].project.vpcConfig.vpcId
                    }
                    if (this.scfs[i].project.vpcConfig.hasOwnProperty("subnetId")) {
                        this.chksubnet = this.scfs[i].project.vpcConfig.subnetId
                    }
                    if (this.scfs[i].project.vpcConfig.isvpc == "true") {
                        this.showvpc(this.scfs[i])
                    }
                    //更新api网关信息
                    if (this.scf.project.apigw.isapi == "true") {
                        this.apigatewayid = this.scf.project.apigw.serviceId
                    }

                    //查询api网关服务列表
                    this.loadApiGateWay(id)
                }
            }
        },
        
        changeapigateway(){
            console.info("changeapigateway", this.chkapigateways)
            for (let i = 0; i < this.scfs.length; ++i) {
                if(this.scfs[i].showactive){
                    let tmps = []
                    for(chk of this.chkapigateways){
                        for(aps of this.apigateways){
                            if(chk==aps.ServiceId){
                                tmps.push({
                                    serviceId:aps.ServiceId,
                                    serviceName:aps.ServiceName
                                })
                            }
                        }
                    }
                    this.scfs[i].project.apigw = tmps
                }
            }
        },

        //查询api网关信息
        loadApiGateWay(id) {
            this.isloadapi = true
            let tmps = []
            for(let i=0;i<this.scf.project.apigw.length;++i){
                //跳过初始化的空api网关信息
                if(this.scf.project.apigw[i].serviceId!=""){
                    tmps.push(this.scf.project.apigw[i].serviceId)
                }
            }
            this.chkapigateways = tmps
            APIGATEWAY.listservices(id, this.listApiGateWay)
        },

        //查询api网关信息完毕,初始化并显示api网关信息
        listApiGateWay(res) {
            console.info(res)
            this.isloadapi = false
            //查询网关失败
            if (typeof (res) == 'string') {
                this.apiwarninfo = res
                return
            }
            this.apigateways = res.Result.ServiceSet
        },

        /**
         * 展示新增项目页面还是项目信息页面
         */
        showaddpro: function () {
            this.showaddproject = true
            for (let i = 0; i < this.scfs.length; ++i) {
                this.scfs[i].showactive = false
            }
        },

        /**
         * 代码路径
         */
        chosecodepath: function (id) {
            let path = dialog.showOpenDialogSync({
                properties: ['openDirectory']
            })
            this.scfs.forEach(scf => {
                if (scf.id == id) {
                    scf.project.codeUri = path[0]
                    return
                }
            });

        },

        delproject: function () {
            for (let i = 0; i < this.scfs.length; ++i) {
                if (this.scfs[i].id == this.scf.id) {
                    this.scfs.splice(i, 1)
                }
            }
            config.saveConfig(this.scfs)
            UIkit.modal.dialog('<p class="uk-modal-body">删除配置信息完毕!</p>')
            this.showaddpro()
        },
        /**
         * 保存项目配置
         */
        saveproject: function () {
            console.info("update file")
            config.saveConfig(this.scfs)
        },

        /**
         * 新增项目
         */
        save: function () {
            if (this.id == "") {
                dialog.showErrorBox("提示", "请输入SecretId")
                return
            }
            if (this.key == "") {
                dialog.showErrorBox("提示", "请输入SecretKey")
                return
            }
            if (this.name == "") {
                dialog.showErrorBox("提示", "请输入项目名称")
                return
            }
            let sr = config.addProject(this.appid, this.id, this.key, this.name)
            if (sr.res === false) {
                UIkit.modal.dialog('<p class="uk-modal-body">' + sr.info + '!</p>');
                return
            }
            UIkit.modal.dialog('<p class="uk-modal-body">添加完毕!</p>');
            this.scfs.push(sr.info)
        }
    }
})

