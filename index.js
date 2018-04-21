var fs = require("fs")
var path = require("path")
var logger = require('winston');
var moment = require('moment')
logger.emitErrs = true;
logger.loggers.add('DATALOG', { console: { level: 'debug', label: "DATALOG", handleExceptions: true, json: false, colorize: true}});
var log = logger.loggers.get('DATALOG');

module.exports = class{
    constructor(logname){
        this.logname = logname
        this.chartSize = 60
        this.dataLast = null
        this.timeLast = null
        this.timeLive = null
        this.formatSec = "YYYY-MM-DD HH:mm:ss"
        this.formatMin = "YYYY-MM-DD HH:mm:00"
        this.formatHour = "YYYY-MM-DD HH:00"
        this.formatDay = "YYYY-MM-DD ddd"
        this.formatWeek = "YYYY-ww"
        this.chartLive = []
        this.chartSecond = {
            labels:[],
            series:[[],[],[]]
        }
        this.chartMinute = {
            labels:[],
            series:[[],[],[]]
        }
        this.chartHour = {
            labels:[],
            series:[[],[],[]]
        }
        this.chartDay = {
            labels:[],
            series:[[],[],[]]
        }
        this.chartWeek = {
            labels:[],
            series:[[],[],[]]
            }
        for( let i=0 ; i < this.chartSize ; i++){
            this.chartSecond.labels.push("")
            this.chartSecond.series[0].push(0)
            this.chartSecond.series[1].push(0)
            this.chartSecond.series[2].push(0)
            this.chartMinute.labels.push("")
            this.chartMinute.series[0].push(0)
            this.chartMinute.series[1].push(0)
            this.chartMinute.series[2].push(0)
            this.chartHour.labels.push("")
            this.chartHour.series[0].push(0)
            this.chartHour.series[1].push(0)
            this.chartHour.series[2].push(0)
            this.chartDay.labels.push("")
            this.chartDay.series[0].push(0)
            this.chartDay.series[1].push(0)
            this.chartDay.series[2].push(0)
            this.chartWeek.labels.push("")
            this.chartWeek.series[0].push(0)
            this.chartWeek.series[1].push(0)
            this.chartWeek.series[2].push(0)
        }
    }
    name(data){
        return this.logname
    }
    
    logLive(){
        let count = 0
        let sum = 0
        let avg = 0
        let max = null
        let min = null
        this.chartLive.forEach((d,index)=>{
            let data = d[0]
            count += 1
            sum += data
            avg = sum/count
            if (max == null || data > max){
                max = data
            }
            if (min == null || data < min){
                min = data
            }
        })
        this.chartSecond.labels[this.chartSize-1] = this.timeLive.format(this.formatSec)
        this.chartSecond.series[0][this.chartSize-1] = max
        this.chartSecond.series[1][this.chartSize-1] = avg
        this.chartSecond.series[2][this.chartSize-1] = min
    }

    logSeconds(){
        let count = 0
        let sum = 0
        let avg = 0
        let max = null
        let min = null
        this.chartLive.forEach((d,index)=>{
            let data = d[0]
            count += 1
            sum += data
            avg = sum/count
            if (max == null || data > max){
                max = data
            }
            if (min == null || data < min){
                min = data
            }
        })
        this.chartSecond.labels.push( this.timeLive.format(this.formatSec))
        this.chartSecond.series[0].push(max)
        this.chartSecond.series[1].push(avg)
        this.chartSecond.series[2].push(min)
        this.chartSecond.labels.shift()
        this.chartSecond.series[0].shift()
        this.chartSecond.series[1].shift()
        this.chartSecond.series[2].shift()
    }
    
    logMinutes(){
        let max = null
        let min = null
        let sum = 0
        let count = 0
        let length = this.chartSecond.labels.length
        let fromChart = this.chartSecond
        let toChart = this.chartMinute
        let ltime = this.timeLast.format(this.formatMin)
        for (let i = length-1 ; i>= 0 ; i--){
            let ctime = moment(fromChart.labels[i],this.formatSec).format(this.formatMin)
            let cdataMax = fromChart.series[0][i]
            let cdataAvg = fromChart.series[1][i]
            let cdataMin = fromChart.series[2][i]
            if ( ctime == ltime ){
                count += 1
                sum += cdataAvg
                if(max == null || cdataMax > max){
                    max = cdataMax
                }
                if(min == null || cdataMin < min){
                    min = cdataMin
                }
            }
        }
        if (count < 1) {
            return false;
        }
        let avg = sum/count
        toChart.labels.shift()
        toChart.series[0].shift()
        toChart.series[1].shift()
        toChart.series[2].shift()
        toChart.labels.push(ltime)
        toChart.series[0].push(max)
        toChart.series[1].push(avg)
        toChart.series[2].push(min)
        return true
    }

    logHours(){
        let max = null
        let min = null
        let sum = 0
        let count = 0
        let length = this.chartMinute.labels.length
        let fromChart = this.chartMinute
        let toChart = this.chartHour
        let ltime = this.timeLast.format(this.formatHour)
        for (let i = length-1 ; i>= 0 ; i--){
            let ctime = moment(fromChart.labels[i],this.formatMin).format(this.formatHour)
            let cdataMax = fromChart.series[0][i]
            let cdataAvg = fromChart.series[1][i]
            let cdataMin = fromChart.series[2][i]
            if ( ctime == ltime ){
                count += 1
                sum += cdataAvg
                if(max == null || cdataMax > max){
                    max = cdataMax
                }
                if(min == null || cdataMin < min){
                    min = cdataMin
                }
            }
        }
        if (count < 1) {
            return false;
        }
        let avg = sum/count
        toChart.labels.shift()
        toChart.series[0].shift()
        toChart.series[1].shift()
        toChart.series[2].shift()
        toChart.labels.push(ltime)
        toChart.series[0].push(max)
        toChart.series[1].push(avg)
        toChart.series[2].push(min)
        return true
    }

    logDays(){
        let max = null
        let min = null
        let sum = 0
        let count = 0
        let length = this.chartHour.labels.length
        let fromChart = this.chartHour
        let toChart = this.chartDay
        let ltime = this.timeLast.format(this.formatDay)
        for (let i = length-1 ; i>= 0 ; i--){
            let ctime = moment(fromChart.labels[i],this.formatHour).format(this.formatDay)
            let cdataMax = fromChart.series[0][i]
            let cdataAvg = fromChart.series[1][i]
            let cdataMin = fromChart.series[2][i]
            if ( ctime == ltime ){
                count += 1
                sum += cdataAvg
                if(max == null || cdataMax > max){
                    max = cdataMax
                }
                if(min == null || cdataMin < min){
                    min = cdataMin
                }
            }
        }
        if (count < 1) {
            return false;
        }
        let avg = sum/count
        toChart.labels.shift()
        toChart.series[0].shift()
        toChart.series[1].shift()
        toChart.series[2].shift()
        toChart.labels.push(ltime)
        toChart.series[0].push(max)
        toChart.series[1].push(avg)
        toChart.series[2].push(min)
        return true
    }

    logWeeks(){
        let max = null
        let min = null
        let sum = 0
        let count = 0
        let length = this.chartHour.labels.length
        let fromChart = this.chartHour
        let toChart = this.chartDay
        let ltime = this.timeLast.format(this.formatDay)
        for (let i = length-1 ; i>= 0 ; i--){
            let ctime = moment(fromChart.labels[i],this.formatHour).format(this.formatDay)
            let cdataMax = fromChart.series[0][i]
            let cdataAvg = fromChart.series[1][i]
            let cdataMin = fromChart.series[2][i]
            if ( ctime == ltime ){
                count += 1
                sum += cdataAvg
                if(max == null || cdataMax > max){
                    max = cdataMax
                }
                if(min == null || cdataMin < min){
                    min = cdataMin
                }
            }
        }
        if (count < 1) {
            return false;
        }
        let avg = sum/count
        toChart.labels.shift()
        toChart.series[0].shift()
        toChart.series[1].shift()
        toChart.series[2].shift()
        toChart.labels.push(ltime)
        toChart.series[0].push(max)
        toChart.series[1].push(avg)
        toChart.series[2].push(min)
        return true
    }

    log(input,timeLive){
        this.timeLive = timeLive
        let data = parseFloat(input)
        if(this.dataLast === null) { //This only runs when the first data is logged
            this.dataLast = data
            this.timeLast = timeLive.clone()
        }
        if(timeLive.isBefore(this.timeLast)){
            console.log("Incoming time of data is before last data. Discarding...")
            return(false)
        }

        if (this.timeLast.format(this.formatSec) == timeLive.format(this.formatSec)){
            this.chartLive.push([data,timeLive.format(this.formatSec)])
            this.logLive()
        }
        else{
            if (this.timeLast.format(this.formatMin) != timeLive.format(this.formatMin)){
                this.logMinutes()
            }
            if (this.timeLast.format(this.formatHour) != timeLive.format(this.formatHour)){
                this.logHours()
            }
            if (this.timeLast.format(this.formatDay) != timeLive.format(this.formatDay)){
                this.logDays()
            }
            if (this.timeLast.format(this.formatWeek) != timeLive.format(this.formatWeek)){
                this.logWeeks()
            }
            this.chartLive=[]
            this.chartLive.push([data,timeLive.format(this.formatSec)])
            this.logSeconds(timeLive)

        }
        this.timeLast = timeLive.clone()
        this.dataLast = data     
        return true
    }


    getChartSecData(index){
        return([ this.chartSecond.series[0][index], this.chartSecond.series[1][index], this.chartSecond.series[2][index] ])
    }
    getChartMinData(index){
        return([this.chartMinute.series[0][index],this.chartMinute.series[1][index],this.chartMinute.series[2][index]])
    }
    getChartHourData(index){
        return([this.chartHour.series[0][index],this.chartHour.series[1][index],this.chartHour.series[2][index]])
    }
    getChartDayData(index){
        return([this.chartDay.series[0][index],this.chartDay.series[1][index],this.chartDay.series[2][index]])
    }
    getChartWeekData(index){
        return([this.chartDay.series[0][index],this.chartDay.series[1][index],this.chartDay.series[2][index]])
    }
    getChartSecTime(index){
        return(this.chartSecond.labels[index])
    }
    getChartMinTime(index){
        return(this.chartMinute.labels[index])
    }
    getChartHourTime(index){
        return(this.chartHour.labels[index])
    }
    getChartDayTime(index){
        return(this.chartDay.labels[index])
    }
    getChartWeekTime(index){
        return(this.chartWeek.labels[index])
    }

}