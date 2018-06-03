const fs = require("fs")
const path = require("path")
const appRoot = require("app-root-path").path
const dir = path.join( appRoot, "log")
const _ = require("lodash")  //used for defaults
const dirLogFile = path.join( appRoot, "mytest.log")
const winston = require('winston');
const moment = require('moment')
const util = require("util")
const setTimeoutPromise = util.promisify(setTimeout);
const File = require('ucipass-file')
const readline = require('readline');
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
    }
    log(newdata,newtime){ // newdata is type float, newtime is type moment
        if (newtime == null) newtime = moment() // normally you should send time but if not current time will be used
        let lastData = this.arrData[this.maxIndex] // this is to compare new incoming data/time with last data in memory
        if (newtime.isBefore(lastData.lastTime)){
            console.log("Discarding...incoming time of log:",newtime.format(),"is before last log:",lastData.lastTime.format())
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
    }
    async readFileLog(){
        var resolve,reject
        var p = new Promise((res,rej)=>{resolve=res;reject=rej})
        console.log('Started reading log file:',this.filename);
        const rl = readline.createInterface({
            input: fs.createReadStream(this.filename),
            crlfDelay: Infinity
        });
        rl.on('line', (line) => {
            //console.log(`Line from file: ${line}`);
            try {
                let j = JSON.parse(line)
                this.arrData.shift()
                this.arrData.push({
                    label: j.label,
                    lastTime: moment(j.label,this.format),
                    max: j.max,
                    avg: j.avg,
                    min: j.min,
                    count: 1               
                })
            } catch (error) {
                console.log("Error during JSON parse",error)
            }
        });
        rl.on('close', () => {
            console.log('Finished reading log file:',this.filename);
            resolve("Success Reading file: "+this.filename)
        });
        rl.on('error', () => {
            console.log('Error reading log file:',this.filename);
            Rejct("ERROR Reading file: "+this.filename)
        });
        return p
    }
    readMemLog(){
        return this.arrData.map((item)=>{
            return {
                label : item.label, 
                avg: item.avg,
                max: item.max,
                min: item.min,
                count: item.count                
            } 
        })
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

