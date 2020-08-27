var COS = window.nodeRequire("../qcloud/cos.js");
var CONFIG = window.nodeRequire("../config");
var SCF = window.nodeRequire("../scfnet");

let app = new Vue({
    el: '#main',
    data: {

        projects: [],
        chkProject: {},

        loading: true,

        //检索条件中的命名空间和函数名
        namespaces: [],
        functions: [],

        //图表展示
        showChart:true,

        /**
         * 查询条件
         */
        queryCon: {
            //日志偏移量
            offset: 0,
            retCode: "",
            namespace: "default",
            functionName: "",
            startTime: "2011-08-19T13:45:00",
            endTime: "2011-08-19T13:45:00",
            keyword: "",
            functionRequestId: "",
            //当前时间
            nowTime: "",
            //能查询日志的最远日期
            lastTime: "",
            //该条件下所有日志数量
            totalCount: 0,

            loading: false
        },

        //查询出的scf日志列表
        scfLogs: [],
        //展示的日志信息
        showLog: [],
        
        //查询命名空间
        loadNS:false,
        //查询命名空间下函数
        loadFN:false
    },
    created: function () {
        this.init()
        this.initTime()
        // SCF.deploy("")
    },
    mounted: function () {
        console.info("mounted")
        this.loading = false
    },
    methods: {

        /**
         * 多项目切换
         */
        changeProject(id){
            this.scfLogs = []
            CONFIG.changeChkConfig(id)
            this.init()
        },


        /**
         * 统计图表
         */
        flushEChart() {
            let legend = []
            let xAxis = []
            let series = []
            let memseries = []

            let functions = []

            //摘取所有的函数
            for (let i = 0; i < this.scfLogs.length; ++i) {
                let ex = false
                for (let k = 0; k < functions.length; ++k) {
                    if (functions[k].fun == this.scfLogs[i].FunctionName) {
                        ex = true
                    }
                }
                if (!ex) {
                    functions.push({ fun: this.scfLogs[i].FunctionName, series: [], mem:[] })
                }
            }

            //依次获取所有函数的执行时间
            for (let i = 0; i < this.scfLogs.length; ++i) {
                // xAxis.push("第" + (i + 1))
                for (let k = 0; k < functions.length; ++k) {
                    if (functions[k].fun == this.scfLogs[i].FunctionName) {
                        functions[k].series.push(this.scfLogs[i].Duration)
                        functions[k].mem.push(this.scfLogs[i].MemUsage/(1024*1024))
                        break
                    }
                }
            }
            //最高被调用的函数次数
            let maxcount = 0
            for (let i = 0; i < functions.length; ++i) {
                legend.push(functions[i].fun)
                if (maxcount < functions[i].series.length) {
                    maxcount = functions[i].series.length
                }
                series.push({
                    name: functions[i].fun,
                    type: 'line',
                    stack: '执行时间',
                    data: functions[i].series
                })

                memseries.push({
                    name: functions[i].fun,
                    type: 'line',
                    stack: '内存消耗',
                    areaStyle: {},
                    data: functions[i].mem
                })
            }

            for (let i = 0; i < maxcount; ++i) {
                xAxis.push("第" + (i+1) + "次")
            }
            this.initDurationChart(legend,xAxis, series)
            this.initMemChart(legend,xAxis, memseries)
        },
        /**
         * 执行时间图表
         * @param {*} legend 
         * @param {*} xAxis 
         * @param {*} series 
         */
        initDurationChart(legend,xAxis, series){
            let myChart = echarts.init(document.getElementById('areabar'))
            if(legend.length==0){
                myChart.clear()
                return
            }
            console.info(legend,xAxis, series)
            let option = {
                title: {
                    text: '执行时间(ms)'
                },
                tooltip: {
                    trigger: 'axis'
                },
                legend: {
                    data: legend
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                toolbox: {
                    feature: {
                        saveAsImage: {}
                    }
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: xAxis
                },
                yAxis: {
                    type: 'value'
                },
                series: series
            };
           
            myChart.setOption(option);
            let that = this
            myChart.on('click', function (params) {
                that.showLogFromChart(params.seriesName, params.dataIndex)
            });
        },

        /**
         * 内存资源消耗图表
         */
        initMemChart(legend,xAxis, memseries){
            let myChart = echarts.init(document.getElementById('membar'))
            if(legend.length==0){
                myChart.clear()
                return
            }
            let option2 = {
                title: {
                    text: '资源消耗(M)'
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross',
                        label: {
                            backgroundColor: '#6a7985'
                        }
                    }
                },
                legend: {
                    data: legend
                },
                toolbox: {
                    feature: {
                        saveAsImage: {}
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: [
                    {
                        type: 'category',
                        boundaryGap: false,
                        data: xAxis
                    }
                ],
                yAxis: [
                    {
                        type: 'value'
                    }
                ],
                series: memseries
            };
            
            myChart.setOption(option2);
            let that = this
            myChart.on('click', function (params) {
                that.showLogFromChart(params.seriesName, params.dataIndex)
            });
        },

        /**
         * 根据图表的信息打开对应的日志信息
         * @param {*} fn  函数名
         * @param {*} inx 索引下标
         */
        showLogFromChart(fn, inx){
            console.info(fn, inx)
            let tmpinx = 0
            for(let i=0;i<this.scfLogs.length;++i){
                if(this.scfLogs[i].FunctionName==fn){
                    if(tmpinx==inx){
                        this.getRequestLog(i)
                        return
                    }
                    tmpinx++
                }
            }
        },



        /**
         * 根据requestid查询对应的日志信息
         * @param {string} rid 
         */
        getRequestLog(inx) {
            console.info(inx)
            this.showLog = []
            for (let i = 0; i < this.scfLogs.length; ++i) {
                this.scfLogs[i].show = false
                if (inx == i) {
                    this.showLog.push("请求Id：" + this.scfLogs[i].RequestId)
                    this.showLog.push("执行耗时：" + this.scfLogs[i].Duration +
                        "ms,    计费时间：" + this.scfLogs[i].BillDuration +
                        "ms,    消耗内存：" + (this.scfLogs[i].MemUsage / 1024 / 1024) + "M")
                    this.scfLogs[i].show = true
                }
            }
            $("#showjson").JSONView(this.scfLogs[inx]);
            this.showChart = false
        },

        /**
         * 切换详情页展示
         */
        changeEChart(nav){
            this.showChart = nav
        },

        /**
         * 修改起始时间
         */
        changeStartTime() {
            let date = new Date(this.queryCon.startTime).getTime();
            let nextd = new Date(date + 1000 * 60 * 60 * 24)
            let fd = this.getInputTime(nextd.getFullYear(), nextd.getMonth() + 1, nextd.getDate(), nextd.getHours(), nextd.getMinutes())
            console.info(fd)
            this.queryCon.endTime = fd
            this.queryCon.startTime += ":00"
        },

        /**
         * 修改终止时间
         */
        changeEndTime() {
            let date = new Date(this.queryCon.endTime).getTime();
            let nextd = new Date(date - 1000 * 60 * 60 * 24)
            let fd = this.getInputTime(nextd.getFullYear(), nextd.getMonth() + 1, nextd.getDate(), nextd.getHours(), nextd.getMinutes())
            console.info(fd)
            this.queryCon.startTime = fd
            this.queryCon.endTime += ":00"
        },

        /**
         * 初始化日志相关的日期信息,
         * 
         */
        initTime() {
            var date = new Date();
            var year = date.getFullYear();
            var month = date.getMonth() + 1;
            var day = date.getDate();
            var hour = date.getHours();
            var minute = date.getMinutes();

            this.queryCon.nowTime = this.getInputTime(year, month, day, hour, minute)
            this.queryCon.endTime = this.queryCon.nowTime

            //初始化前一天,开始和终止日期仅能间隔一天
            let fd = new Date(date.getTime() - 1000 * 60 * 60 * 24)

            this.queryCon.lastTime = this.getInputTime(fd.getFullYear(), fd.getMonth() + 1, fd.getDate(), fd.getHours(), fd.getMinutes())
            this.queryCon.startTime = this.queryCon.lastTime
        },

        getInputTime(y, m, d, h, i) {
            if (m < 10) {
                m = "0" + m
            }
            if (d < 10) {
                d = "0" + d
            }
            if (h < 10) {
                h = "0" + h
            }
            if (i < 10) {
                i = "0" + i
            }
            return y + "-" + m + "-" + d + "T" + h + ":" + i + ":00"
        },

        /**
         * 初始化页面数据
         */
        init() {
            this.loadNS = true
            SCF.listNameSpace(this.initNs)
            this.initProjectSet()
        },

        /**
         * 初始化命名空间
         * @param {*} res 
         */
        initNs(res) {
            this.loadNS = false
            if (typeof (res) == "string") {

            } else {
                this.namespaces = res.Namespaces
                this.listFunctions("default")
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
         * 列举指定命名空间下的函数
         */
        listFunctions(ns) {
            this.loadFN = true
            this.functions = []
            SCF.listFunction(this.initFunctions, 0, 20, ns)
        },

        initFunctions(res) {
            if (res.hasOwnProperty("Functions")) {
                //显示      
                // this.showFunctions = res.Functions
                //总数
                this.cloudFunctionTotal = res.TotalCount
                //页数
                //合并到全部函数
                this.functions = this.functions.concat(res.Functions)

                if (this.functions.length < res.TotalCount) {
                    SCF.listFunction(this.initFunctions, this.functions.length, res.TotalCount - this.functions.length)
                }else{
                    this.loadFN = false
                }
            } else {
                dialog.showMessageBox({ type: "warning", message: "错误提示", detail: res.message })
            }

        },

        /**
         * 切换命名空间
         */
        changeNamespace() {
            console.info(this.queryCon.namespace)
            this.listFunctions(this.queryCon.namespace)
        },

        /**
         * 查询日志
         */
        queryLog() {
            this.queryCon.loading = true
            this.scfLogs = []
            SCF.getFunctionLogs(this.queryCon, this.finQueryLog)
        },


        /**
         * 接受并格式化SCF日志
         * @param {*} res 
         */
        finQueryLog(res) {
            this.queryCon.loading = false
            console.info(res)
            this.queryCon.totalCount = res.TotalCount
            this.queryCon.offset += res.Data.length
            let tmps = res.Data
            for (let i = 0; i < tmps.length; ++i) {
                tmps[i].show = false
                let log = tmps[i].Log.split("\n")
                tmps[i].Log = log
                tmps[i].RetMsg = JSON.parse(tmps[i].RetMsg)
            }
            this.scfLogs = this.scfLogs.concat(tmps)

            //全部查询完毕,展示图表分析
            this.flushEChart()
        }
    }
})

