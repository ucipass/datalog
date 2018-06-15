const fs = require("fs")
const path = require("path")
const appRoot = require("app-root-path").path
const dir = path.join( appRoot, "log")
const _ = require("lodash")  //used for defaults
const dirLogFile = path.join( appRoot, "mytest.log")
const winston = require('winston');
const log = new (winston.Logger)({transports: [ new (winston.transports.Console)({level:"error"}) ]});
//log.transports.console.level = "error"
var lineReader = require('reverse-line-reader');
const moment = require('moment')
const util = require("util")
const setTimeoutPromise = util.promisify(setTimeout);
const File = require('ucipass-file')
const defaultSettings = {
    name: "default",
    logdir: path.join(appRoot,"log"),
    format: "seconds",
    maxSize: 60,
    logEnabled: true
}

class Datalog{
    constructor(settings){
        let def = _.defaults(settings,defaultSettings)
        this.name = def.name
        this.formatName = def.format
        this.filename = path.join(def.logdir, "datalog_"+def.name+"_"+def.format+".log")
        this.maxIndex = def.maxSize - 1
        this.format =           // DON NOT CHANGE! moment.js format used to determine if data belong to the same time period
        "seconds" == def.format ? "YYYY-MM-DD HH:mm:ss" :
        "minutes" == def.format ? "YYYY-MM-DD HH:mm:00" :
        "hours" == def.format ? "YYYY-MM-DD HH:00:00" :
        "days" == def.format ? "YYYY-MM-DD ddd" :
        "weeks" == def.format ? "YYYY wo [week]" :
        "YYYY-MM-DD HH:mm:ss"
        this.logEnabled = def.logEnabled
        this.arrData = new Array(def.maxSize).fill({
                label:null,     // datatime format in type string for X coordinates and debugging
                lastTime:null,  // datatime in type moment
                avg:0,          // average value during the format time period
                count:0,        // number of samples during the time period
                max: 0,         // maximum value during the format time period
                min:0           // minimum value during the format time period
            })
        this.arrData.name = this.name
        this.logger = new (winston.Logger)({
            transports: [
                new (winston.transports.File)({
                    filename: this.filename,
                    maxsize:'10000000',  // 10MB
                    maxFiles:'2',
                    timestamp: true
                })
            ]
        });
        this.initComplete = this.logEnabled ? this.readFileLog() : Promise.resolve(true)
        this.init = ()=> { return this.initComplete }
    }
    async log(newdata,newtime){ // newdata is type float, newtime is type moment
        await this.initComplete
        if (newtime == null) newtime = moment() // normally you should send time but if not current time will be used
        let lastData = this.arrData[this.maxIndex] // this is to compare new incoming data/time with last data in memory
        if (newtime.isBefore(lastData.lastTime)){
            log.error("Discarding...incoming time of log:",newtime.format(),"is before last log:",lastData.lastTime.format())
            return false;
        }
        // If data is in the same time duration do not log to file rather average it
        if ( lastData.label == newtime.format(this.format) ){
            lastData.lastTime = newtime.clone()
            if ( newdata > lastData.max ) { lastData.max = newdata}
            if ( newdata < lastData.min ) { lastData.min = newdata}
            lastData.avg = (lastData.avg * lastData.count + newdata) / (lastData.count + 1)
            lastData.count += 1
            //console.log(lastData.count)
        }
        // if new data is NOT in the same time duration (by format) log last array cell to file, shift and log new data in memory
        else{
            // last mem arraycell will not change since new timestamp is coming in so log to file
            let logdata = {
                label : this.arrData[this.maxIndex].label, 
                avg: this.arrData[this.maxIndex].avg,
                max: this.arrData[this.maxIndex].max,
                min: this.arrData[this.maxIndex].min,
                count: this.arrData[this.maxIndex].count
            }
            if ( this.logEnabled && logdata.label !=null){    // If there is no data do not log! 
                this.logger.info(logdata) // WRITE DATA TO LOG!
            }            
            let json = {
                label: newtime.format(this.format),
                lastTime: newtime.clone(),
                max: parseFloat(newdata),
                avg: parseFloat(newdata),
                min: parseFloat(newdata),
                count: 1
            }
            // add new cell and shift
            this.arrData.shift()
            this.arrData.push(json)
        }
        return Promise.resolve(true)
    }
    async readFileLog(){
        var resolve,reject
        var p = new Promise((res,rej)=>{resolve=res;reject=rej})
        if( !fs.existsSync(this.filename) ) {resolve(this.arrData);return p;}
        log.info('Started reading log file:',this.filename,new Date());
        let lineCounter = 0;
        let lines = []
        let format = this.format
        let filename = this.filename
        let arrData = this.arrData
        lineReader.eachLine(this.filename, function(line, last, cb) {
            log.debug("Current Line:",line);
            try {
                if (line.length > 1){
                    let j = JSON.parse(line.trim())
                    lines.push({
                        label: j.label,
                        lastTime: moment(j.label,format),
                        max: j.max,
                        avg: j.avg,
                        min: j.min,
                        count: j.count               
                    })
                    lineCounter++
                }
            } catch (error) {
                console.log("Error during JSON parse",error)
            }              

            if (lineCounter == 60 || last) {
                cb(false); // stop reading
                log.info('Finished reading log file:',filename, new Date());
                while (lines.length > 0) {
                    arrData.shift()
                    arrData.push( lines.pop() )
                }
               resolve(arrData)
            } else {
                cb();
            }
        });
        return p
    }
    readMemLog(){
        let msg = { name: this.name, format: this.format, formatName: this.formatName, maxset:0, minset:Number.MAX_VALUE }
        msg.data = this.arrData.map((item)=>{
            if (item.max > msg.maxset) {
                msg.maxset = item.max
            }
            if (item.min < msg.minset) {
                msg.minset = item.min
            }
            return {
                label : item.label, 
                avg: item.avg,
                max: item.max,
                min: item.min,
                count: item.count                
            } 
        })
        return msg
    }
}

module.exports = Datalog

if (require.main == module){
    console.log("called directly")
    var datalog = new Datalog()
    if(fs.existsSync(datalog.filename)) {fs.unlinkSync(datalog.filename);};
    (async function(){
        let counter = 61
        let time = moment()
        let start = moment().clone()
        for(i=1 ; i<= counter; i++){
            datalog.log(i,time)
            time.add(1,"seconds")
        }
        await setTimeoutPromise(1000)
        console.log( start.format(datalog.format) , time.format(datalog.format))
        let datalog2 = new Datalog()
        await datalog2.readFileLog()
        console.log(datalog.readMemLog()[58])
        console.log(datalog2.readMemLog()[59])
        console.log("finished")
    })();

}

