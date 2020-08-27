// const dialog  = window.nodeRequire("electron").remote;
const { shell, dialog } = window.nodeRequire('electron').remote;
var COS = window.nodeRequire("../qcloud/cos.js");
var CONFIG = window.nodeRequire("../config");
var SCF = window.nodeRequire("../scfnet");


let app = new Vue({
    el: '#main',
    data: {
        url: "",
        loadfun: true,
        //SCF命名空间及函数
        namespaces: [],

        showdash: true,
        tabparas: [],

        //请求参数
        paras: [{ key: "", value: "" }],
        //参数请求类型
        contentType: "application/json",

        localFunctions: [],

        invodeType: "",
        issending: false,
        isshowres: false,
        //展示格式:JSON XML HTML TEXT 
        resshowtype: "JSON",
        //是否格式化显示 format-格式化 text-文本模式
        resshowcate: "format",

        //展示api执行结果
        showres: "",
        //结果展示插件
        editor: "",

        finload: false,

        projects: [],
        chkProject: {},

        //查询队列,用以标志是否全部的函数信息都已经查询完毕,0为完毕
        queryInx: 0,
        //存储:查询命名空间失败后的错误提示信息
        namespacewarn: "",

        searchKey: ""
    },
    mounted: function () {
        console.info("mounted")
        this.finload = true

        for (let i = 0; i < this.tabparas.length; ++i) {
            this.tabparas[i].editor = CodeMirror.fromTextArea(document.getElementById("code" + i), {
                mode: "simplemode",
                lineNumbers: true
            });
        }

    },
    created: function () {
        let aa = ["adsfds", "aasdfsdf"]
        // $("#inputfun").autocomplete({
        //     source: aa
        // });
        this.init()
    },

    methods: {
        getUrlParam(paraName) {
            var url = document.location.toString();
            var arrObj = url.split("?");

            if (arrObj.length > 1) {
                var arrPara = arrObj[1].split("&");
                var arr;

                for (var i = 0; i < arrPara.length; i++) {
                    arr = arrPara[i].split("=");

                    if (arr != null && arr[0] == paraName) {
                        return arr[1];
                    }
                }
                return "";
            }
            else {
                return "";
            }
        },
        changeProject(id) {
            this.namespaces = []
            CONFIG.changeChkConfig(id)
            this.init()
        },

        /**
         * 界面数据初始化
         */
        init() {
            this.loadFunSet()
            this.initProjectSet()
        },

        initProjectSet() {
            this.projects = CONFIG.getConfig()
            for (let i = 0; i < this.projects.length; ++i) {
                if (this.projects[i].chk) {
                    this.chkProject = this.projects[i]
                }
            }

        },

        //是否格式化显示结果
        changeShowFormat(res) {
            for (let i = 0; i < this.tabparas.length; ++i) {
                if (this.tabparas[i].active) {
                    this.tabparas[i].resshowcate = res
                    if (res == "text") {
                        this.switchResShowType("TEXT")
                    } else if (res == "scflog") {
                        //SCF执行日志
                        //查询日志
                        this.tabparas[i].loadscflog = true//显示加载动画
                        console.info("this.tabparas[i].requestid", this.tabparas[i].requestid)



                        SCF.getFunctionLogs({ functionRequestId: this.tabparas[i].requestid }, this.showSCFLog)
                    } else {
                        this.switchResShowType("JSON")
                    }


                }
            }


        },

        //切换结果显示样式
        switchResShowType(res) {
            let inx = -1
            for (let i = 0; i < this.tabparas.length; ++i) {
                if (this.tabparas[i].active) {
                    inx = i
                }
            }

            this.tabparas[inx].resshowtype = res


            if (res == "JSON") {
                $("#json" + inx).JSONView(JSON.parse(this.tabparas[inx].showres));
                return
            } else if (res == "SCFLOG") {
                console.info(this.tabparas[inx].scflog)
                $("#json" + inx).JSONView(this.tabparas[inx].scflog);
                return
            } else {
                let edit = this.tabparas[inx].editor
                edit.setValue(this.tabparas[inx].showres)
                edit.setOption("readOnly", true)
                setTimeout(
                    function () {
                        edit.refresh();
                    }.bind(this),
                    1
                );
            }


        },

        //从本地配置文件读取项目信息
        loadFunSet() {
            this.localFunctions = CONFIG.getChkConfig().functions
            //查询SCF命名空间数量
            this.loadfun = true
            SCF.listNameSpace(this.initNameSpace)
        },

        /**
         * 同步SCF的命名空间数量
         * @param {object} res SDK返回的命名空间信息 
         */
        initNameSpace(res) {
            if (res.hasOwnProperty("Namespaces")) {
                for (let i = 0; i < res.Namespaces.length; ++i) {
                    res.Namespaces[i].functions = []
                    res.Namespaces[i].expanded = "false"
                }
                this.namespaces = res.Namespaces

                //查询命名空间下函数列表
                for (let i = 0; i < this.namespaces.length; ++i) {
                    //每个namespace在队列+1
                    this.queryInx++
                    SCF.listFunction(this.flushFunctions, 0, 20, this.namespaces[i]["Name"])
                }
            } else {
                //标识查询结束
                this.loadfun = false
                this.namespacewarn = res
            }
        },

        /**
         * 切换为总览选项卡
         */
        showDash() {
            this.showdash = true
            for (let i = 0; i < this.tabparas.length; ++i) {

                this.tabparas[i].active = false
            }
        },

        //更改激活的SCF函数选项卡
        changeActiveSCF(inx) {
            for (let i = 0; i < this.tabparas.length; ++i) {
                this.tabparas[i].active = false
            }
            this.tabparas[inx].active = true
            this.showdash = false
        },

        //修改选择SCF调用方式
        changeInvokeType(type) {
            for (let i = 0; i < this.tabparas.length; ++i) {
                if (this.tabparas[i].active) {
                    this.tabparas[i].invodeType = type
                    if (type == "dx") {
                        this.tabparas[i].disabledurl = true
                    } else {
                        this.tabparas[i].disabledurl = false
                    }
                    return
                }
            }
        },

        //调用SCF函数
        invokeFunction() {
            //获取当前激活的选项页
            let activeinx = -1
            for (let i = 0; i < this.tabparas.length; ++i) {
                if (this.tabparas[i].active) {
                    activeinx = i
                }
            }
            //格式化请求参数
            let paras = this.tabparas[activeinx].paras
            let ps = {}
            if (paras[0].key != "") {
                for (let i = 0; i < paras.length; ++i) {
                    ps[paras[i].key] = paras[i].value
                }
            }

            let url = this.tabparas[activeinx].apigateway

            if (this.tabparas[activeinx].invodeType == "post") {
                if (url == "") {
                    dialog.showMessageBox({ type: "warning", message: "提示信息", detail: "API网关地址为空" })
                    return
                }
                this.tabparas[activeinx].isshowres = false
                this.tabparas[activeinx].issending = true
                SCF.postInvode(url, ps, this.finInvoke, this.tabparas[activeinx].contentType)
            } else if (this.tabparas[activeinx].invodeType == "get") {
                if (url == "") {
                    dialog.showMessageBox({ type: "warning", message: "提示信息", detail: "API网关地址为空" })
                    return
                }
                this.tabparas[activeinx].isshowres = false
                this.tabparas[activeinx].issending = true
                SCF.postInvode(url, ps, this.finInvoke, this.tabparas[activeinx].contentType)
            } else if (this.tabparas[activeinx].invodeType == "dx") {
                this.tabparas[activeinx].isshowres = false
                this.tabparas[activeinx].issending = true
                SCF.dxInvode(this.tabparas[activeinx].namespace, this.tabparas[activeinx].scfname, ps, this.finDxInvoke)
            } else {
                dialog.showMessageBox({ type: "warning", message: "提示信息", detail: "请选择调用方式" })
            }

        },

        /**
         * SCF直接调用回调函数
         * @param {} res 
         */
        finDxInvoke(res) {
            let activeinx = this.getActiveInx()
            this.tabparas[activeinx].issending = false
            this.tabparas[activeinx].isshowres = true
            this.tabparas[activeinx].showres = res.Result.RetMsg
            this.tabparas[activeinx].requestid = res.RequestId
            this.switchResShowType("JSON")
        },
        /**
         * 当前激活的函数详情卡索引
         */
        getActiveInx() {
            let activeinx = -1
            for (let i = 0; i < this.tabparas.length; ++i) {
                if (this.tabparas[i].active) {
                    activeinx = i
                }
            }
            return activeinx
        },

        /**
         * POST GET 调用回调函数
         * @param {*} res 
         */
        finInvoke(res) {
            let activeinx = this.getActiveInx()

            this.tabparas[activeinx].issending = false
            this.tabparas[activeinx].isshowres = true
            this.tabparas[activeinx].showres = res.responseText
            this.tabparas[activeinx].requestid = res.getResponseHeader("X-Api-RequestId")

            this.switchResShowType("JSON")
        },


        /**
         * SCF远程执行的日志查询
         * @param {*} res 
         */
        showSCFLog(res) {
            console.info(res)
            for (let i = 0; i < this.tabparas.length; ++i) {
                if (this.tabparas[i].active) {
                    //停止旋转动画
                    this.tabparas[i].loadscflog = false
                    let pa = res

                    if (pa.TotalCount == 0) {
                        pa.warninfo = '无执行日志信息, SCF的执行日志信息一般会在被调用5-10秒后才能查询到,请几秒后点击"查看执行日志"按钮刷新信息'
                    } else {
                        console.info(pa)
                        for (let i = 0; i < pa.Data.length; ++i) {
                            console.info(pa.Data[i].RetMsg, pa.Data[i].Log)
                            pa.Data[i].RetMsg = JSON.parse(pa.Data[i].RetMsg)
                            pa.Data[i].Log = pa.Data[i].Log.split("\n")
                        }
                    }

                    this.tabparas[i].scflog = pa
                    this.switchResShowType("SCFLOG")
                }
            }
        },


        //添加参数
        addpara() {
            for (let i = 0; i < this.paras.length; ++i) {
                if (this.paras[i].key == "") {
                    dialog.showMessageBox({ type: "warning", message: "提示信息", detail: "请先设置已有参数的key" })
                    return
                }
            }
            this.paras.push({ key: "", value: "" })
        },

        /**
         * 若导航进来时有指定函数,刷新左侧函数状态,选择中指定函数
         */
        initLeftNav(ns, fun) {


            for (let i = 0; i < this.namespaces.length; ++i) {
                this.namespaces[i].show = false
                if (this.namespaces[i].Name == ns) {
                    for (let k = 0; k < this.namespaces[i].functions.length; ++k) {
                        if (this.namespaces[i].functions[k].FunctionName == fun) {
                            this.namespaces[i].show = true
                            //
                            console.info("index", i, k)
                            this.setScfUrl(i, k)
                            return
                        }
                    }
                }
            }
        },

        //
        //fn
        /**
         * 切换SCF函数, 设置scf函数对应的api网关url
         * @param {*} nsinx 命名空间索引
         * @param {*} fninx 函数索引
         * @param {*} ns 
         */
        setScfUrl(nsinx, fninx) {
            let fn = this.namespaces[nsinx].functions[fninx].FunctionName
            let tmps = this.tabparas
            let ns = this.namespaces[nsinx].Name
            console.info("setScfUrl", ns, fn)

            for (let i = 0; i < tmps.length; ++i) {
                tmps[i].active = false
            }


            let tmp = {
                active: true,
                scfname: fn,
                namespace: this.namespaces[nsinx].Name,
                //请求参数
                paras: [{ key: "", value: "" }],
                //参数请求类型
                contentType: "application/json",
                localFunctions: [],
                invodeType: "",
                issending: false,
                isshowres: false,
                //展示格式:JSON XML HTML TEXT 
                resshowtype: "JSON",
                //是否格式化显示 format-格式化 text-文本模式
                resshowcate: "format",

                //展示api执行结果
                showres: "",
                //结果展示插件
                editor: "",
                //api网关
                apigateway: "",

                editor: {},
                //scf日志加载状态
                loadscflog: false
            }

            //修改左侧的被选择的函数的UI
            for (let i = 0; i < this.namespaces.length; ++i) {
                let fns = this.namespaces[i].functions
                for (let k = 0; k < fns.length; ++k) {
                    this.namespaces[i].functions[k].cls = ""
                    //匹配选择同一个命名空间下同名函数
                    if (this.namespaces[i].Name == ns && fns[k].FunctionName == fn) {
                        this.namespaces[i].functions[k].cls = "g-bg-black-opacity-0_1"
                    }
                }
            }
            tmp.apigateway = SCF.getFunctionUrl(fn)
            if (tmp.apigateway == "") {
                dialog.showMessageBox({ type: "warning", message: "提示信息", detail: "该函数未配置对应的API网关" })
            }
            tmps.push(tmp)
            this.tabparas = tmps
            this.showdash = false

            //初始化代码编辑器
            setTimeout(this.initLastEdit, 1000);

            $(document.body).animate({
                scrollTop: 0
            },200)

            return
        },

        initLastEdit() {
            let lst = this.tabparas.length - 1
            this.tabparas[lst].editor = CodeMirror.fromTextArea(document.getElementById("code" + lst), {
                mode: "simplemode",
                lineNumbers: true
            });
        },



        /**
         * 从本地文件读取函数的api网关请求类型配置信息
         * @param {string} fn 函数名称
         * @return {string}  未查找到返回-- 否则为请求类型
         */
        getApigwFromLocal(fn) {
            for (let k = 0; k < this.localFunctions.length; ++k) {
                if (this.localFunctions[k].inputs.name == fn) {
                    if (this.localFunctions[k].inputs.hasOwnProperty("events")) {
                        let events = this.localFunctions[k].inputs.events
                        for (let z = 0; z < events.length; ++z) {
                            if (events[z].hasOwnProperty("apigw")) {
                                if (events[z].apigw.parameters.hasOwnProperty("endpoints")) {
                                    return events[z].apigw.parameters.endpoints[0].method
                                }
                            }
                        }
                    }
                }
            }
            return "--"
        },

        /**
         * 格式化从SCF查询的函数列表
         * @param {*} res 
         */
        flushFunctions(res) {
            //查询完毕一次,队列-1
            this.queryInx--

            this.loadfun = false
            if (res.Functions.length == 0) {
                return
            }
            let total = res.TotalCount
            let fns = res.Functions
            let ns = res.Functions[0].Namespace

            //刷新函数对应的API网关信息
            for (let i = 0; i < fns.length; ++i) {
                fns[i].localtype = this.getApigwFromLocal(fns[i].FunctionName)
            }

            //合并函数
            for (let i = 0; i < this.namespaces.length; ++i) {
                if (this.namespaces[i].Name == ns) {

                    if (this.namespaces[i].hasOwnProperty("functions")) {
                        this.namespaces[i].functions = this.namespaces[i].functions.concat(fns)
                    } else {
                        this.namespaces[i].functions = fns
                    }

                    let left = total - this.namespaces[i].functions.length
                    if (left > 0) {
                        //有需要查询的信息 待完成队列+1
                        this.queryInx++
                        SCF.listFunction(this.flushFunctions, this.namespaces[i].functions.length, left, ns)
                    }
                    // 
                }
            }

            console.info("this.queryInx", this.queryInx)
            //函数列表完全查询完毕, 执行自动选择操作
            if (this.queryInx == 0) {
                let ns = this.getUrlParam("ns")
                let fun = this.getUrlParam("fun")
                this.initLeftNav(ns, fun)

                let tmps = []
                for (ns of this.namespaces) {
                    for (fn of ns.functions) {
                        tmps.push(fn.FunctionName)
                    }
                }


                $("#tags").autocomplete({
                    source: tmps
                });
            }
        },

        /**
         * 检索定位函数
         */
        searchFunction(){
            let key = this.$refs.search.value
            if(key==""){
                return
            }
            for (ns of this.namespaces) {
                for (fn of ns.functions) {
                    if(fn.FunctionName==key){
                        this.initLeftNav(ns.Name, fn.FunctionName)
                    }
                }
            }
        },

        /**
         * 关闭选项页
         * @param {int} inx 选项页索引
         */
        closeTab(inx) {
            let that = this
            let promise = dialog.showMessageBox({
                type: "none",
                buttons: ["取消", "关闭"],
                defaultId: 0,
                message: "您要关闭此选项卡吗"
            })
            promise.then(function (data) {
                if (data.response == 1) {
                    console.info(inx)
                    that.tabparas.splice(inx, 1)
                    //无选项卡 展示总览
                    if (that.tabparas.length == 0) {
                        that.showDash()
                        return
                    }
                    //显示被关闭选项卡前一个
                    if (that.tabparas.length > inx) {
                        that.changeActiveSCF(inx)
                    } else {
                        that.changeActiveSCF(that.tabparas.length - 1)
                    }
                }
            });

        }
    }
})

