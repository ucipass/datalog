const fs = require("fs")
const path = require("path")
const logger = require('winston');
var csv = require("fast-csv");
logger.emitErrs = true;
logger.loggers.add('DATALOG', { console: { level: 'debug', label: "DATALOG", handleExceptions: true, json: false, colorize: true}});
const moment = require('moment')
const util = require("util")
const File = require('ucipass-file')
const Readable = require('stream').Readable
const Json2csvTransform = require('json2csv').Transform;
const readdir = util.promisify(fs.readdir)        //fs.readdir(path[, options], callback)
const log = logger.loggers.get('DATALOG');
const opts = { fields: ['max', 'avg', 'min'] }
const transformOpts = { highWaterMark: 16384, encoding: 'utf-8' };
const setTimeoutPromise = util.promisify(setTimeout);
const dir = path.parse(process.mainModule.filename).dir

class History{
    constructor(format,maxSize,name){
        this.format = format
        this.maxIndex = maxSize-1
        this.name = name
        this.fileName = name ? path.join(dir, name+".log") : path.join( dir, "datalog_"+format.replace(/\W/g, '')+".log")
        this.streamLiveRead = null
        this.streamLiveWrite = null
        this.streamEndPromise = null // Promise resolved when logging is completed called by InitLogging
        this.arrData = []
        for( let i = 0 ; i < maxSize ; i++){
            this.arrData.push( {label:null, lastTime:null, max: 0, avg:0, min:0, count:0} )
        }
    }
    log(newdata,newtime){
        let lastData = this.arrData[this.maxIndex]
        if (newtime.isBefore(lastData.lastTime)){
            console.log("Incoming time of log:",newtime.format(),"is before last log:",lastData.lastTime.format())
            return false;
        }
        if ( lastData.label == newtime.format(this.format) ){
            lastData.lastTime = newtime.clone()
            if ( newdata > lastData.max ) { lastData.max = newdata}
            if ( newdata < lastData.min ) { lastData.min = newdata}
            lastData.avg = (lastData.avg * lastData.count + newdata) / (lastData.count + 1)
            lastData.count += 1
            //console.log(lastData.count)
        }
        else{
            let json = {
                label: newtime.format(this.format),
                lastTime: newtime.clone(),
                max: parseFloat(newdata),
                avg: parseFloat(newdata),
                min: parseFloat(newdata),
                count: 1
            }
            this.arrData.shift()
            this.arrData.push(json)
            // Save last log that is final
            if ( this.streamLiveWrite != null && this.arrData[this.maxIndex-1].label != null){
                this.saveFileLog(this.arrData[this.maxIndex-1])
            }
        }
    }
    async checkOrMoveFileLog(){
        let resolveEnd,rejectEnd
        let p = new Promise((res,rej)=>{resolveEnd=res;rejectEnd=rej})
        let fileName = this.fileName
        let arrData = []
        let format = this.format
        let maxIndex = this.maxIndex
        let file = new File (fileName)
        if (! await file.isFile()){
            return
        }
        console.log("Checking existing logfile:",fileName)
        let stream = fs.createReadStream(fileName);
        stream.on("error", function(){
            console.log("Error streaming from file:",fileName);
            process.exit()
        });
        csv
        .fromStream(stream, {headers: true})
        .on("data", function(data){
            //console.log(data);
            try{
            let json = {
                label: data.label,
                lastTime: moment(data.label,format),
                max: parseFloat(data.max),
                avg: parseFloat(data.avg),
                min: parseFloat(data.min),
                count: parseInt(data.count)
            }
            if ( json.label == "" || !json.lastTime.isValid() ){
                console.log("Invalid data from file:", fileName, JSON.stringify(json))
            }else{
                arrData.shift()
                arrData.push(json)                        
                }
            }catch(e){ console.log("Error on data processing",e)}
        })
        .on("end", function(){
            //console.log("done");
            if (arrData.length <1){
                console.log("No data in log file. Deleting..")
                try{
                    let newFileName = fileName+"_err_"+moment().format("YYMMDD-mmhhA")+".log"
                    fs.renameSync(fileName, newFileName)
                    fs.appendFileSync(newFileName, "\n no data to process")
                }catch(e){console.log(e);process.exit()}
                resolveEnd()
                return
            }
            resolveEnd()
            return
        })
        .on("error", function(err){
            console.log("Error Parsing CSV File creating new file",err);
            try{
                let newFileName = fileName+"_err_"+moment().format("YYMMDD-mmhhA")+".log"
                fs.renameSync(fileName, newFileName)
                fs.appendFileSync(newFileName, "\n"+err.toString())
            }catch(e){console.log(e);process.exit()}
            resolveEnd()
            return
        });
        return p      
    }
    async startFileLog(){
        let resolveEnd,rejectEnd
        this.streamEndPromise = new Promise((res,rej)=>{resolveEnd=res;rejectEnd=rej})
        let fileName = this.fileName
        let arrData = this.arrData
        let format = this.format
        let maxIndex = this.maxIndex
        await this.checkOrMoveFileLog()
        if ( await (new File(fileName)).isFile() ){
            let resolve,reject
            let loadLogFilePromise = new Promise((res,rej)=>{resolve=res;reject=rej})
            console.log("Loading existing logfile:",fileName)
            let stream = fs.createReadStream(fileName);
            stream.on("error", function(){
                console.log("Error streaming from file:",fileName);
                reject("Error streaming from file:")
            });
            csv
            .fromStream(stream, {headers: true})
            .on("data", function(data){
                //console.log(data);
                let json = {
                    label: data.label,
                    lastTime: moment(data.label,format),
                    max: parseFloat(data.max),
                    avg: parseFloat(data.avg),
                    min: parseFloat(data.min),
                    count: parseInt(data.count)
                }
                if ( json.label == "" || !json.lastTime.isValid() ){
                    console.log("Invalid data from file:", fileName, JSON.stringify(json))
                }else{
                    let prevLogTime = moment(arrData[maxIndex].label)
                    if ( prevLogTime.isValid() && json.lastTime.isSameOrBefore(prevLogTime)){
                        console.log("File log entry:",json.lastTime.format(format),"is same or before last logged entry:",prevLogTime.format(format))
                    }else{
                        arrData.shift()
                        arrData.push(json)                        
                    }
                }
            })
            .on("end", function(){
                //console.log("done");
                resolve("done")
            })
            .on("error", function(){
                //console.log("Error Parsing CSV File");
                reject("Error Parsing CSV File or program error on CSV parser")
            });
            await loadLogFilePromise
            fs.appendFileSync(fileName,"\n")
            this.streamLiveWrite = fs.createWriteStream(fileName,{flags: "a"});
            this.streamLiveRead = csv.createWriteStream({headers: false})  
        }
        else{
            console.log("Creating new logfile:",fileName)
            this.streamLiveWrite = fs.createWriteStream(fileName,{flags: "w"});
            this.streamLiveRead = csv.createWriteStream({headers: true})
        }
        this.streamLiveRead
            .on("data", function(data){
                //console.log(data);
            })
            .on("end", function(){
                //console.log("Readstream done");
            })
            .on("error", function(err){
                console.log("Readstream Error",err);
            });
        this.streamLiveWrite
            .on("data", function(data){
                //console.log(data);
            })
            .on("finish", function(){
                console.log("Writestream finish", fileName);
                resolveEnd()
            })
            .on("error", function(err){
                console.log("Writestream Error",err);
            });
        this.streamLiveRead.pipe(this.streamLiveWrite);
        console.log("Logging Started")
        //return promiseEnd
    }
    async endFileLog(){
        if (this.streamLiveRead != null){
            this.streamLiveRead.end();           
        }else{
            console.log("no log file can't end logging")
        }
        return this.streamEndPromise
    }
    saveFileLog(json){
        if (this.streamLiveRead != null){
            this.streamLiveRead.write({ label: json.label, max: json.max, avg:json.avg, min:json.min, count:json.count });               
        }else{
            console.log("no log file can't save log")
        }
    }
}

class Chart{
    constructor(logname){
        this.logname = logname ? logname : "anonymous"
        this.logSec = new History("YYYY-MM-DD HH:mm:ss",60,this.logname+"_sec")
        this.logMin = new History("YYYY-MM-DD HH:mm:00",60,this.logname+"_min")
        this.logHour = new History("YYYY-MM-DD HH:00:00",60,this.logname+"_hour")
        this.logDay = new History("YYYY-MM-DD ddd",60,this.logname+"_day")
        this.logWeek = new History("YYYY wo [week]",60,this.logname+"_week")
    }

    log(input,timeLive){
        this.timeLive = timeLive
        this.data = parseFloat(input)
        this.logSec.log(input,timeLive)
        this.logMin.log(input,timeLive)
        this.logHour.log(input,timeLive)
        this.logDay.log(input,timeLive)
        this.logWeek.log(input,timeLive)
    }

    getSec(){ return this.logSec }
    getMin(){ return this.logMin }
    getHour(){ return this.logHour }
    getDay(){ return this.logDay }
    getWeek(){ return this.logWeek }

    getLastSec(){ return this.logSec.arrData[this.logSec.maxIndex] }
    getLastMin(){ return this.logMin.arrData[this.logMin.maxIndex] }
    getLastHour(){ return this.logHour.arrData[this.logHour.maxIndex] }
    getLastDay(){ return this.logDay.arrData[this.logDay.maxIndex] }
    getLastWeek(){ return this.logWeek.arrData[this.logWeek.maxIndex] }

    getChartSecond(){
        let array = this.logSec.arrData
        let chart = { labels: [], series: [[],[],[]] }
        array.forEach((item,index) => {
            chart.labels.push( item.label )
            chart.series[0].push(item.max)
            chart.series[1].push(item.avg)
            chart.series[2].push(item.min)             
        });
        return chart;
    }
    getChartMinute(){
        let array = this.logMin.arrData
        let chart = { labels: [], series: [[],[],[]] }
        array.forEach((item,index) => {
            chart.labels.push( item.label)
            chart.series[0].push(item.max)
            chart.series[1].push(item.avg)
            chart.series[2].push(item.min)             
        });
        return chart;
    }
    getChartHour(){
        let array = this.logHour.arrData
        let chart = { labels: [], series: [[],[],[]] }
        array.forEach((item,index) => {
            chart.labels.push( item.label )
            chart.series[0].push(item.max)
            chart.series[1].push(item.avg)
            chart.series[2].push(item.min)             
        });
        return chart;
    }
    getChartDay(){
        let array = this.logDay.arrData
        let chart = { labels: [], series: [[],[],[]] }
        array.forEach((item,index) => {
            chart.labels.push( item.label )
            chart.series[0].push(item.max)
            chart.series[1].push(item.avg)
            chart.series[2].push(item.min)             
        });
        return chart;
    }
    getChartWeek(){
        let array = this.logWeek.arrData
        let chart = { labels: [], series: [[],[],[]] }
        array.forEach((item,index) => {
            chart.labels.push( item.label )
            chart.series[0].push(item.max)
            chart.series[1].push(item.avg)
            chart.series[2].push(item.min)             
        });
        return chart;
    }
}

module.exports = Chart

if (require.main == module){
    console.log("called directly")
    let myClass = module.exports
    let instance = new MyClass("maintest")
}