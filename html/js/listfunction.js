var COS = window.nodeRequire("../qcloud/cos.js");
var CONFIG = window.nodeRequire("../config");
var SCF = window.nodeRequire("../scfnet");

let app = new Vue({
    el: '#main',
    data: {
        cloudFunctionPage: 0,
        cloudFunctionTotal: 0,
        showFunctions: [],
        allCloudFunctions: [],

        localFunctions: [],
        allFunctions: [],

        listcon: "all",//local cloud
        deploytxts: [],//shell 执行sls--debug的文本信息
        page: 1,
        searchKey: "",

        //自动化部署
        isdeploying: false,

        //命名空间
        namespaces: [],
        chknamespace: "default",


        projects: [],
        chkProject: {},

        loading: true
    },
    watch: {
        page: function (nv) {
            this.showPageFunction(nv)
        },
        searchKey: function (nv) {
            console.info(nv)
        },
        listcon: function (nv) {
            console.info(nv)
            this.showPageFunction(1)
        }
    },
    created: function () {

        this.init()

        // SCF.deploy("")



    },
    mounted: function () {
        console.info("mounted")
        this.loading = false
    },
    methods: {
        /**
         * 初始化页面数据
         */
        init() {
            this.initProjectSet()
            this.loadConfFun()
            SCF.listNameSpace(this.initNs)
        },


        //初始化命名空间
        initNs(res) {
            if (typeof (res) == "string") {

            } else {
                this.namespaces = res.Namespaces
            }

        },

        //初始化项目列表
        initProjectSet() {
            this.projects = CONFIG.getConfig()
            for (let i = 0; i < this.projects.length; ++i) {
                if (this.projects[i].chk) {
                    this.chkProject = this.projects[i]
                }
            }
        },

        /**
         * removeScf
         * @param {*} fn 
         */
        removefun(fn) {
            this.deploytxts = []
            console.info("removefun", fn)
            this.isdeploying = true
            SCF.remove(fn, this.flushSlsTxt, this.findeploy)
        },

        deployfun(fn) {
            this.deploytxts = []
            console.info("deployfun", fn)
            this.isdeploying = true
            SCF.deploy(fn, this.flushSlsTxt, this.findeploy)
        },

        //删除函数
        delfun(fn) {
            let that = this
            UIkit.modal.confirm('您要删除函数:' + fn + "吗?").then(function () {
                CONFIG.removeFun(fn)
                that.loadConfFun()
            }, function () {
                console.log('Rejected.')
            });
        },

        flushSlsTxt(info) {
            console.info(info)
            this.deploytxts.push(info)

        },

        findeploy() {
            this.isdeploying = false
            this.loadConfFun()
        },

        /**
         * 多项目切换
         */
        changeProject(id) {
            this.cloudFunctionPage = 1
            this.allFunctions = []
            this.showFunctions = []

            CONFIG.changeChkConfig(id)
            this.init()
        },


        /**
         * 读取命名空间下函数的入口
         * 先读取本地配置文件的,再读取SCF云上的函数
         * 本地配置文件存在 但云不存在则为未部署
         */
        loadConfFun() {
            this.allCloudFunctions = []
            this.localFunctions = []

            let fns = CONFIG.listChkFunction()
            for (let i = 0; i < fns.length; ++i) {
                //筛选命名空间函数
                if (fns[i].inputs.namespace == this.chknamespace) {
                    this.localFunctions.push(
                        {
                            FunctionName: fns[i].name,
                            Description: fns[i].inputs.description,
                            Runtime: fns[i].inputs.runtime,
                            ModTime: "未部署",
                            islocal: true
                        }
                    )
                }
            }
            SCF.listFunction(this.initFunction, 0, 20, this.chknamespace)
        },

        //首次查询云端函数列表完毕
        initFunction: function (res) {
            if (res.hasOwnProperty("Functions")) {
                //显示      
                // this.showFunctions = res.Functions
                //总数
                this.cloudFunctionTotal = res.TotalCount
                //页数
                //合并到全部函数
                this.allCloudFunctions = this.allCloudFunctions.concat(res.Functions)

                if (res.TotalCount > 20) {
                    SCF.listFunction(this.allLeftFunction, 20, res.TotalCount - 20)
                } else {
                    this.initAllFunction()
                }

            } else {
                dialog.showMessageBox({ type: "warning", message: "错误提示", detail: res.message })
            }
        },


        //查询剩余全部云端函数
        allLeftFunction: function (res) {
            this.allCloudFunctions = this.allCloudFunctions.concat(res.Functions)
            this.initAllFunction()
        },

        //合并本地和远程函数
        initAllFunction() {
            this.allFunctions = []
            //本地配置是否已经部署
            for (let i = 0; i < this.localFunctions.length; ++i) {
                let ex = false
                for (let k = 0; k < this.allCloudFunctions.length; ++k) {
                    if (this.localFunctions[i].FunctionName == this.allCloudFunctions[k].FunctionName) {
                        ex = true
                        break
                    }
                }
                if (!ex) {
                    this.localFunctions[i]["iscloud"] = false
                    this.allFunctions.push(this.localFunctions[i])
                }
            }

            //从线上查询出的函数扣除本地配置文件中的函数
            for (let i = 0; i < this.allCloudFunctions.length; ++i) {
                let ex = false
                for (let k = 0; k < this.allFunctions.length; ++k) {
                    if (this.allCloudFunctions[i].FunctionName == this.allFunctions[k].FunctionName) {
                        ex = true
                    }
                }
                if (!ex) {
                    this.allCloudFunctions[i]["iscloud"] = true
                    this.allFunctions.push(this.allCloudFunctions[i])
                }
            }
            //格式化UI数据
            this.formatShowFun(this.allFunctions)
            this.initAuto()
            this.showPageFunction(1)
        },

        searchFun(){
            let key = this.$refs.searchKey.value
            console.info(key)
            let tmps = []
            for(let fun of this.allFunctions){
                if(fun.FunctionName.indexOf(key) != -1 ){
                    tmps.push(fun)
                }
            }
            this.formatShowFun(tmps)
            this.showPageFunction(1)
        },

        /**
         * 将入参格式化成UI展示元素
         */
        formatShowFun(fns) {
            //生成函数排序序列
            for (let i = 0; i < fns.length; ++i) {
                fns[i].inx = i + 1
            }
            this.sourceFunctions = fns
            this.cloudFunctionPage = Math.ceil(fns.length / 20)
        },

        /**
         * 首页
         */
        firstPage() {
            this.showPageFunction(1)
        },
        /**
         * 最后页
         */
        endPage() {
            this.showPageFunction(this.cloudFunctionPage)
        },

        //翻页
        showPageFunction: function (page) {
            // listcon:"all",//local cloud
            let tmps = []
            //函数类型切换下的翻页
            if (this.listcon == "all") {
                tmps = this.sourceFunctions
            } else {
                let cloud = true
                if (this.listcon == "local") {
                    cloud = false
                }
                for (let i = 0; i < this.sourceFunctions.length; ++i) {
                    if (this.sourceFunctions[i].iscloud == cloud) {
                        tmps.push(this.sourceFunctions[i])
                    }
                }
            }
            this.page = page
            let showtmps = []
            for (let i = (page - 1) * 20; i < page * 20 && i < tmps.length; ++i) {
                showtmps.push(tmps[i])
            }
            this.showFunctions = showtmps

            $('body,html').animate({
                scrollTop: 0
            }, 500);
        },

        changecate(cate) {
            this.listcon = cate
        },

        //搜索框
        initAuto: function () {
            let fns = []
            //生成函数排序序列
            for (let i = 0; i < this.allFunctions.length; ++i) {
                fns.push(this.allFunctions[i].FunctionName)
            }

            $("#tags").autocomplete({
                source: fns
            });
        },

        nextPage: function () {
            this.page++
        },
        prePage: function () {
            this.page--
        }
    }
})

