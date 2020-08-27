const tencentcloud = window.nodeRequire("tencentcloud-sdk-nodejs");
var fs = window.nodeRequire("fs");
var Vpc = window.nodeRequire("../qcloud/vpc.js");

var COS = window.nodeRequire("../qcloud/cos.js");
var SCF = window.nodeRequire("../scfnet");
var config = window.nodeRequire("../config");

let app = new Vue({
    el: '#main',
    data: {
        //当前SCF环境配置
        scf: {},
        //当前项目配置
        fun: {},
        //接口api信息
        environment: [{ name: "", val: "" }],
        tags: [{ name: "", val: "" }],
        showvpc: "close",
        //被选择的api文件
        chkapifile: "",
        apifiles: [],
        chkapifunction: "",
        apifunctions: [],
        //事件
        event: "",
        //api网关触发模式
        apigw: {
            apitype: "fix",
            dynamic: [],
            apigateways: [],
            serviceId: "",
            integratedResponse: "FALSE",
            cors: "TRUE", responseType: "JSON", protocols: "https", method: "POST", required: "TRUE",
            param: [{ name: "", required: "FALSE", type: "string", defaultValue: "", desc: "" }]
        },
        //cos触发模式
        cosgw: {},
        timergw: {
            name: "",
            txt: "",
            sec: 0, min: 0, hour: 0, day: 0, month: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], week: [0, 1, 2, 3, 4, 5, 6],
            type: "fix",
            //循环触发设置
            cir:{
                type:"",
                txt:"",
                //循环触发设置的值
                number:""
            }
        },

        //账号COS下Buckets的列表
        buckets: {},

        //命名空间列表
        namespace: [],
        //是否正在SCF查询命名空间
        loadnamespace: false,

        //是否添加
        addnamespace: {
            show: false,
            name: ""
        },

        //UI初始化状态
        istotalload: true,
        //导航栏的项目信息
        projects: [],
        chkProject: {},

        //true=精简模式, false完整模式
        simpleMode: true,
    },
    mounted: function () {
        this.istotalload = false
    },
    created: function () {

        this.initUIData()
        this.initProjectSet()
    },
    watch: {
   
        'timergw.type': function (nv, ov) {
            this.timergw.sec = 0
            this.timergw.min = 0
            this.timergw.hour = 0
            this.timergw.day = 0
            this.timergw.txt = ""
            this.timergw.week = [0, 1, 2, 3, 4, 5, 6]
            this.timergw.month = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
            this.getCron()

        },
        timergw: {
            deep: true,
            handler(nv, ov) {
                this.getCron()
            }
        },
        'showvpc': function (nv, ov) {
            if (nv == "open") {
                console.info(this.fun)
                if (this.fun.vpcConfig.isvpc != 'true') {
                    dialog.showMessageBox({ type: "warning", message: "错误提示", detail: "您尚未开启VPC服务信息,请在'项目配置'中添加VPC信息" })
                    this.showvpc = "close"
                    return
                }
            }
        },
        'fun.runtime': function (nv, ov) {
            console.info(nv, ov)
            //首次初始化的时候不更新
            if (ov == undefined) {
                return;
            }
            var word = /php.*/i
            console.debug(word.test(nv))
            if (word.test(nv)) {
                this.listapifile()
            }

        },
        'fun.codeUri': function (nv, ov) {
            console.info(nv, ov)
            var word = /php.*/i

            if (word.test(this.fun.runtime)) {
                this.listapifile()
            }
        },



        'chkapifunction': function () {
            this.flushApiGatewaySet()
        },
        'chkapifile': function (nv, ov) {
            for (file of this.apifiles) {
                if (file.name == nv) {
                    this.apifunctions = file.function
                    this.chkapifunction = ""
                    break
                }
            }
            this.flushApiGatewaySet()
        }
    },
    methods: {
        /**
         * 修改"触发器"->循环触发 的规则
         * @param {*} type 
         */
        changeCir(type){
            this.timergw.cir.type = type
            if(type=="day"){
                this.timergw.cir.txt = "天"
            }else if(type=="hour"){
                this.timergw.cir.txt = "小时"
            }else if(type=="min"){
                this.timergw.cir.txt = "分"
            }else if(type=="sec"){
                this.timergw.cir.txt = "秒"
            }
        },

        changeDesc() {
            console.info("desc")
            this.flushApiGatewaySet()
        },
        /**
         * 页面配置模式
         * @param {string} res 
         */
        isSimpleMode(res) {
            this.simpleMode = res
        },

        /**
         * 根据配置信息配置api网关部分配置信息
         */
        flushApiGatewaySet() {
            if (this.event == "api") {
                console.info("flush", this.fun.description)
                this.apigw.description = this.fun.description
                this.apigw.name = this.chkapifunction
                this.apigw.path = "/" + this.fun.namespace + "/" + this.chkapifile + "/" + this.chkapifunction
            }
        },
        //切换触发模式
        changeevent() {
            if (this.chkapifunction == "") {
                this.event = ""
                dialog.showMessageBox({ type: "warning", message: "文件配置", detail: "请先配置接口文件和接口函数" })
                return
            }

            if (this.event == "cos") {
                COS.listBuck(this.initCos)
                return
            }

            if (this.event == "api") {
                this.flushApiGatewaySet()
                let that = this
                if (this.apigw.apigateways.length == 0) {
                    let promise = dialog.showMessageBox({
                        type: "none",
                        buttons: ["去设置", "取消"],
                        defaultId: 0,
                        message: "您尚未设置API网关服务,无法使用API网关触发模式"
                    })
                    promise.then(function (data) {
                        that.event = ""
                        if (data.response == 0) {
                            window.location.href = "./set.html"
                        }
                    });
                } else {
                    //设置默认选择的api网关id
                    this.apigw.serviceId = this.apigw.apigateways[0].serviceId
                }
            }

        },
        //切换当前选中项目
        changechkproject(id) {
            console.info(id)
            for (pro of this.projects) {
                if (pro.id == id) {
                    config.changeChkConfig(id)
                    this.initUIData()
                    return
                }
            }
        },

        //初始化UI界面数据
        initUIData() {
            this.initProjectSet()
            this.scf = config.getChkConfig()
            let fun = this.scf.project
            fun.description = ""
            fun.timeout = 30
            fun.handlerfunction = ""
            fun.handlerfile = ""
            fun.environment = { variables: [{ name: "", val: "" },] }
            fun.memorySize = 64
            fun.namespace = "default"
            fun.app = this.scf.app
            fun.org = this.scf.org
            this.fun = fun

            if (fun.vpcConfig.isvpc == "true") {
                this.showvpc = "open"
            }
            this.getCron()
            //API服务信息从项目配置转移到网关
            this.apigw.environment = "release"
            this.apigw.apigateways = this.scf.project.apigw
            //查询命名空间
            this.loadnamespace = true
            SCF.listNameSpace(this.initNameSpace)
        },
        /**
         * 初始化UI的命名空间
         * @param {*} res  str = 错误原因
         */
        initNameSpace: function (res) {
            this.loadnamespace = false
            if (typeof (res) == "string") {
                let promise = dialog.showMessageBox({
                    type: "none",
                    buttons: ["去修改", "取消"],
                    defaultId: 0,
                    message: "查询SCF命名空间失败:" + res
                })
                promise.then(function (data) {
                    if (data.response == 0) {
                        window.location.href = "./set.html"
                    }
                });
                return
            }
            this.namespace = res.Namespaces
        },

        //初始化导航栏上方的项目选择列表
        initProjectSet() {
            this.projects = config.getConfig()
            this.chkProject = config.getChkConfig()
        },


        addNS: function () {
            console.info(this.addnamespace.name)
            SCF.addNameSpace(this.addnamespace.name, this.finAddNS)
        },
        finAddNS() {
            this.fun.namespace = this.addnamespace.name
            this.addnamespace.show = false
            SCF.listNameSpace(this.initNameSpace)
        },

        showAddNS: function () {
            this.addnamespace.show = true
        },

        /**
         * 定时触发
         */
        getFixTime() {
            let nv = this.timergw
            let txt = ["定时触发:"]
            //表达式, 年直接为*
            let ex = ["*"]

            if (nv.week.length == 7) {
                txt.push("每周")
                ex.unshift("*")
            } else {
                for (let m of nv.week) {
                    txt.push("周" + m)
                }
                ex.unshift(nv.week.join(","))
            }

            if (nv.month.length == 12) {
                txt.push("每月")
                ex.unshift("*")
            } else {
                let tmpm = "月份("
                for (let m of nv.month) {
                    tmpm += (m + "月")
                }
                tmpm += ")"
                txt.push(tmpm)
                ex.unshift(nv.month.join(","))
            }

            if (nv.day == 0) {
                ex.unshift("*")
                txt.push("每天")
            } else {
                txt.push(nv.day + "号")
                ex.unshift(nv.day)
            }

            ex.unshift(nv.hour)

            if (nv.min == 0) {
                txt.push(nv.hour + ":00")
                ex.unshift("0")
            } else {
                txt.push(nv.hour + ":" + nv.min)
                ex.unshift(nv.min)
            }

            if (nv.sec == 0) {
                ex.unshift("0")
            } else {
                txt.push(" " + nv.sec + "秒")
                ex.unshift(nv.sec.join(","))
            }

            this.timergw.rule = ex.join(" ")
            this.timergw.txt = txt.join(" ")
        },

        /**
         * 间隔触发
         */
        getCirTime() {
            let nv = this.timergw
            let txt = ["循环触发时间:"]

            if(this.timergw.cir.type==""){
                this.timergw.txt = "请选择循环时间"
                return
            }
            if(this.timergw.cir.cirNumber>59){
                this.timergw.cir.cirNumber = 59
            }

            if(this.timergw.cir.type=="day"){
                this.timergw.rule = "0 0 0 */"+this.timergw.cir.cirNumber+" * * *"
                this.timergw.txt = "每"+this.timergw.cir.cirNumber+"天执行一次"
            }else if(this.timergw.cir.type=="hour"){
                this.timergw.rule = "0 0 */"+this.timergw.cir.cirNumber+" * * * *"
                this.timergw.txt = "每"+this.timergw.cir.cirNumber+"小时执行一次"
            }else if(this.timergw.cir.type=="min"){
                this.timergw.rule = "0 */"+this.timergw.cir.cirNumber+" * * * * *"
                this.timergw.txt = "每"+this.timergw.cir.cirNumber+"分执行一次"
            }else if(this.timergw.cir.type=="sec"){
                this.timergw.rule = "*/"+this.timergw.cir.cirNumber+" * * * * * *"
                this.timergw.txt = "每"+this.timergw.cir.cirNumber+"秒执行一次"
            }          
        },

        //组织生成cron表达式
        getCron: function () {
            if (this.timergw.type == "fix") {
                this.getFixTime()
            } else {
                this.getCirTime()
                
            }
        },
        //查询cos列表
        initCos(res) {
            if (res.hasOwnProperty("error")) {
                dialog.showMessageBox({ type: "warning", message: "查询COS信息失败", detail: res.error.Message })
                return
            } else {
                if (res.Buckets.length == 0) {
                    let promise = dialog.showMessageBox({
                        type: "none",
                        buttons: ["去创建", "确定"],
                        defaultId: 1,
                        message: "无COS信息, 您需要先创建才可以使用"
                    })
                    promise.then(function (data) {
                        console.log('成功：', data.response); // 若成功，运行结果：成功：111
                        if (data.response == 0) {
                            shell.openExternal("https://console.cloud.tencent.com/cos");
                        }
                    });
                    return
                }
                this.buckets = res.Buckets

            }
        },
        //添加环境参数
        addApigwPara() {
            this.apigw.param.push({ name: "", required: "FALSE", type: "string", defaultValue: "", desc: "" })
        },

        delApigwPara(inx) {
            this.apigw.param.splice(inx, 1)
        },
        //包含目录
        delinclude: function (inx) {
            this.fun.include.splice(inx, 1)
        },
        delexclude: function (inx) {
            this.fun.exclude.splice(inx, 1)
        },
        deploy: function () {
            var spawn = window.nodeRequire('child_process').spawn;
            free = spawn('serverless', ['--debug'], { cwd: "/Users/zhangtao/Documents/xiaochengxu/scfgui" });
            // 捕获标准输出并将其打印到控制台 
            free.stdout.on('data', function (data) {
                console.log('standard output:\n' + data);
            });
            // 捕获标准错误输出并将其打印到控制台 
            free.stderr.on('data', function (data) {
                console.log('standard error output:\n' + data);
            });
            // 注册子进程关闭事件 
            free.on('exit', function (code, signal) {
                console.log('child process eixt ,exit:' + code);
            });
            return
        },
        //生成添加scf配置文件
        addscf: function () {

            if (this.scf.project.apigw.serviceName == "") {
                dialog.showMessageBox({ type: "warning", message: "错误提示", detail: "您尚未配置API网关服务信息,请先配置" })
                return
            }
            if (this.scf.project.apigw.serviceId == "") {
                dialog.showMessageBox({ type: "warning", message: "错误提示", detail: "您尚未配置API网关服务信息,请先配置" })
                return
            }

            if (this.chkapifile == "") {
                dialog.showMessageBox({ type: "warning", message: "错误提示", detail: "请选择接口文件" })
                return
            }
            if (this.chkapifunction == "") {
                dialog.showMessageBox({ type: "warning", message: "错误提示", detail: "请选择接口函数" })
                return
            }

            if (this.chkapifunction == "") {
                dialog.showMessageBox({ type: "warning", message: "错误提示", detail: "请选择接口函数" })
                return
            }

            if (this.fun.timeout == 0 || this.fun.timeout == "") {
                dialog.showMessageBox({ type: "warning", message: "错误提示", detail: "超时秒数至少为1" })
                return
            }
            if (this.event == "timer") {
                console.info(this.timergw)
                if (this.timergw.name == "") {
                    dialog.showMessageBox({ type: "warning", message: "错误提示", detail: "请填写触发器名字" })
                    return
                }
            }
            console.info(this.apigw.param)
            if (this.apigw.apitype == "dynamic") {
                for (let i = 0; i < this.apigw.param.length; ++i) {
                    if (this.apigw.param[i].name == "") {
                        dialog.showMessageBox({ type: "warning", message: "错误提示", detail: "可变路径名字不能为空" })
                        return
                    }
                    if (this.apigw.param[i].required == "TRUE" && this.apigw.param[i].defaultValue == "") {
                        dialog.showMessageBox({ type: "warning", message: "错误提示", detail: "可变路径为必须的时候,请填写默认值" })
                        return
                    }
                }
            }

            this.apigw.timeout = this.fun.timeout

            //排除目录和包含目录
            this.fun.handlerfile = this.chkapifile
            this.fun.handlerfunction = this.chkapifunction
            this.fun.environment = this.environment
            this.fun.tags = this.tags
            let touch = {
                type: this.event
            }
            if (this.event == "api") {
                for (gate of this.apigw.apigateways) {
                    if (gate.serviceId == this.apigw.serviceId) {
                        this.apigw.serviceName = gate.serviceName
                    }
                }
                touch.data = this.apigw
                console.info(touch.data)
            } else if (this.event == "cos") {
                touch.data = this.cosgw
            } else if (this.event == "timer") {
                touch.data = this.timergw
            }
            console.info(this.fun)
            if (!config.savefunction(touch, this.fun)) {
                return
            }

            let promise = dialog.showMessageBox({
                type: "none",
                buttons: ["去部署", "继续新增"],
                defaultId: 0,
                message: "处理完毕"
            })
            let that = this
            promise.then(function (data) {
                that.event = ""
                if (data.response == 0) {
                    window.location.href = "./listfunction.html"
                } else {
                    window.location.reload()
                }
            });

        },
        //删除标签
        deltag: function (inx) {
            if (this.tags.length == 1) {
                this.tags = [{ name: "", val: "" }]
            } else {
                this.tags.splice(inx, 1)
            }
        },
        //添加标签
        addtag: function () {
            this.tags.push({ name: "", val: "" })
        },

        /**
         * 删除环境变量
         * @param {*} inx 
         */
        delenv: function (inx) {
            if (this.environment.length == 1) {
                this.environment = [{ name: "", val: "" }]
            } else {
                this.environment.splice(inx, 1)
            }
        },

        /**
         * 添加环境变量
         */
        addenv: function () {
            console.info("add")
            this.environment.push({ name: "", val: "" })
        },
        /**
         * 检索接口文件和接口函数
         */
        listapifile: function () {
            console.info("abc")
            //Java8 Golang1 不自动解析
            if (this.fun.runtime == "Golang1" || this.fun.runtime == "Java8") {
                return
            }
            this.apifiles = []
            const dir = fs.readdirSync(this.fun.codeUri);
            var word = /php.*/i
            if (word.test(this.fun.runtime)) {
                for (filename of dir) {
                    let myRe = /(.*)(\.php)/;
                    let myArray = myRe.exec(filename);
                    if (myArray != null) {
                        let tmp = filename
                        console.info(tmp)
                        fs.readFile(this.fun.codeUri + "/" + tmp, 'utf8', (err, data) => {
                            this.getphpfunctions(tmp, data, myArray[1])
                        });
                    }
                }
            }
        },

        /**
         * php文件中解析出函数名
         * @param {php} ds 
         */
        getphpfunctions: function (fn, ds, onlyname) {
            let arr = ds.split("\n")
            var myRe = /function\s+(\S*)\s*\(/g
            let ffs = []
            for (line of arr) {
                var apis = myRe.exec(line);
                if (apis != null) {
                    ffs.push(apis[1])
                }
            }
            this.apifiles.push({ file: fn, name: onlyname, function: ffs })
        },


        addexclude: function () {
            let paths = dialog.showOpenDialogSync({
                properties: ['openDirectory']
            })
            let ps = this.fun.include
            let ex = false
            for (let i = 0; i < ps.length; ++i) {
                if (ps[i] == paths[0]) {
                    return
                }
            }
            if (paths[0].indexOf(this.fun.codeUri) != 0) {
                dialog.showErrorBox("错误", "只能选择代码目录的子目录")
                return
            }
            let tmp = paths[0].replace(this.fun.codeUri, "")
            if (tmp[0] == "/" || tmp[0] == "\\") {
                this.fun.exclude.push(tmp.substring(1))
            } else {
                this.fun.exclude.push(tmp)
            }

            // this.fun.exclude.push(paths[0])
        },
        addinclude: function () {
            let paths = dialog.showOpenDialogSync({
                properties: ['openDirectory']
            })
            let ps = this.fun.include
            let ex = false
            for (let i = 0; i < ps.length; ++i) {
                if (ps[i] == paths[0]) {
                    return
                }
            }
            this.fun.include.push(paths[0])
        },
        chosecodepath: function () {
            let paths = dialog.showOpenDialogSync({
                properties: ['openDirectory']
            })
            this.fun.codeUri = paths[0]
        }
    }
})

