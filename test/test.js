var assert = require("assert")
var fs = require("fs")
var path = require("path")
var util = require("util")
var File = require("ucipass-file")
var csv = require("fast-csv");
var moment = require("moment")
var datalog = require("../index.js")
const readdir = util.promisify(fs.readdir) 
const setTimeoutPromise = util.promisify(setTimeout);
const json2csv = require('json2csv').parse;
const dir = path.join(__dirname,"..")

describe("Logging Tests" , ()=>{
    before("Not Used", ()=>{
        let dirs = fs.readdirSync(dir)
        dirs.forEach(file => {
            if (path.extname(file) == ".log"){
                fs.unlinkSync(file)
            }
        });
    })
    it("Simple Test", (done)=>{
        done()
    })
    it("Random Test no.1 ", ()=>{
        let chart = new datalog("Basement")
        let sec = 0
        let min = 0  //60
        let hour = 0 //3600
        let day = 0 // 86400
        let time = moment("2018-04-01 22:58:58")
        let origtime = time.clone()
        let newtime = null
        let lastTimeLogged = ""
        chart.log(101,time)
        chart.log(99,time.add(1,"second"))

        assert.equal( chart.getLastMin().max , 101)
        assert.equal( chart.getLastMin().min , 99)
        assert.equal( chart.getLastMin().avg , 100)

        time = moment("2018-04-01 22:59:58")
        chart.log(100,time)
        chart.log(100,time.add(1,"second"))
        assert.equal( chart.getLastMin().max , 100)
        assert.equal( chart.getLastMin().min , 100)
        assert.equal( chart.getLastMin().avg , 100)
        assert.equal( chart.getLastHour().max , 101)
        assert.equal( chart.getLastHour().min , 99)
        assert.equal( chart.getLastHour().avg , 100)
        assert.equal( chart.getLastDay().max , 101)
        assert.equal( chart.getLastDay().min , 99)
        assert.equal( chart.getLastDay().avg , 100)


        time = moment("2018-04-01 23:00:00")
        chart.log(110,time)
        chart.log(90,time.add(1,"second"))
        assert.equal( chart.getLastMin().max , 110)
        assert.equal( chart.getLastMin().min , 90)
        assert.equal( chart.getLastMin().avg , 100)
        assert.equal( chart.getLastHour().max , 110)
        assert.equal( chart.getLastHour().min , 90)
        assert.equal( chart.getLastHour().avg , 100)
        assert.equal( chart.getLastDay().max , 110)
        assert.equal( chart.getLastDay().min , 90)
        assert.equal( chart.getLastDay().avg , 100)

        time = moment("2018-04-01 23:59:58")
        chart.log(103,time)
        chart.log(97,time.add(1,"second"))
        chart.log(100,time.add(1,"second"))
        assert.equal( chart.getLastMin().max , 100)
        assert.equal( chart.getLastMin().min , 100)
        assert.equal( chart.getLastMin().avg , 100)
        assert.equal( chart.getLastHour().max , 100)
        assert.equal( chart.getLastHour().min , 100)
        assert.equal( chart.getLastHour().avg , 100)
        assert.equal( chart.getLastDay().max , 100)
        assert.equal( chart.getLastDay().min , 100)
        assert.equal( chart.getLastDay().avg , 100)
        assert.equal( chart.getLastWeek().max , 110)
        assert.equal( chart.getLastWeek().min , 90)
        assert.equal( chart.getLastWeek().avg , 100)

    })
    it("Stream File Test", async ()=>{
        let chart = new datalog("test_save")
        await chart.logMin.startFileLog()
        let time = moment("2000-01-01")
        chart.log(1, time )
        chart.log(2, time.add(1,"minutes"))
        chart.log(3, time.add(1,"minutes"))
        chart.log(4, time.add(1,"minutes"))
        chart.log(5, time.add(1,"minutes"))
        try{
            let s = fs.readFileSync(chart.logMin.fileName,'utf8')
            return Promise.resolve("File found")
        }catch(e){
            return Promise.reject("File not found")
        }
    })
    it("Save Load Log", async ()=>{
        let time = moment("2000-01-01 10:00:00")
        let mylog1 = new datalog("test_save_load")
        await mylog1.logSec.startFileLog()
        await mylog1.logMin.startFileLog()
        await mylog1.logHour.startFileLog()
        await mylog1.logDay.startFileLog()
        await mylog1.logWeek.startFileLog()
        mylog1.log(1,time.add(10,"minute"))
        mylog1.log(5,time.add(20,"minute"))
        mylog1.log(10,time.add(20,"minute"))
        mylog1.log(30,time)
        mylog1.log(20,time)
        mylog1.log(10,time.add(1,"minute"))
        await mylog1.logSec.endFileLog()
        await mylog1.logMin.endFileLog()
        await mylog1.logHour.endFileLog()
        await mylog1.logDay.endFileLog()
        await mylog1.logWeek.endFileLog()
        //await setTimeoutPromise(500)
        let mylog2 = new datalog("test_save_load")
        await mylog2.logMin.startFileLog()
        let last = mylog2.getLastMin()
        assert.equal( last.max,30)
        assert.equal( last.avg,20)
        assert.equal( last.min,10)
        assert.equal( last.count,3)
        assert.equal( last.label,"2000-01-01 10:50:00")
        await mylog2.logMin.endFileLog()
    })

})
describe("24 hours Logging Tests" , ()=>{
    before("Not Used", async ()=>{
    })
    it("24 Hours test1", async ()=>{
        let chart = new datalog("test_24_hour")
        await chart.logMin.startFileLog()
        await chart.logHour.startFileLog()
        await chart.logDay.startFileLog()
        await chart.logWeek.startFileLog()
        let sec = 0
        let min = 0  //60
        let hour = 0 //3600
        let day = 0 // 86400
        let time = moment("2018-03-31 22:58:58")
        let origtime = time.clone()
        let newtime = null
        let lastTimeLogged = ""
        let data = 1
        for(hour = 0 ; hour < 24 ; hour++){
            for (min = 0 ; min <60 ; min ++){
                for (sec = 0 ; sec<60 ; sec++){
                    chart.log(data,time)
                    let lastSec = chart.getLastSec()
                    assert.ok( lastSec.max == data, "Last Second max is not equal ",data,lastSec)
                    time.add(1,"seconds")
                    data++
                }
                //console.log("Minute Passed")
                let lastMin = chart.getLastMin()
                let format = chart.logMin.format
                assert.equal( lastMin.label,origtime.clone().add(min+1,"minutes").add(hour,"hours").format(format) , "Last Minute Label is not matching after "+moment.duration(sec+min*60+hour*3600, "seconds").humanize()+time.format()   )
            }
            //console.log("Hour Passed")
            let lastHour = chart.getLastHour()
            let format = chart.logHour.format
        assert.equal( lastHour.label,origtime.clone().add(min+1,"minutes").add(hour,"hours").format(format) , "Last Minute Label is not matching after "+moment.duration(sec+min*60+hour*3600, "seconds").humanize()+time.format()   )
        }
        await chart.logMin.endFileLog()
        await chart.logHour.endFileLog()
        await chart.logDay.endFileLog()
        await chart.logWeek.endFileLog()
        let lastDay = chart.getLastDay()
        let format = chart.logDay.format
        assert.equal( lastDay.label , origtime.clone().add(1,'days').format(format), "Last Day mismatch")
        assert.equal( chart.logDay.arrData[chart.logDay.maxIndex-1].label , origtime.format(format), "Last Day mismatch")
    })
    it("24 Hours test2", async ()=>{
        let f1 = await new File("template_24_hour_min.txt")
        await f1.read()
        await f1.write("test2_24_hour_min.log");
        f1 = await new File("template_24_hour_hour.txt")
        await f1.read()
        await f1.write("test2_24_hour_hour.log");
        f1 =await new File("template_24_hour_day.txt")
        await f1.read()
        await f1.write("test2_24_hour_day.log");
        f1 = await new File("template_24_hour_week.txt")
        await f1.read()
        await f1.write("test2_24_hour_week.log");
        let chart = new datalog("test2_24_hour")
        await chart.logMin.startFileLog()
        await chart.logHour.startFileLog()
        await chart.logDay.startFileLog()
        await chart.logWeek.startFileLog()
        let sec = 0
        let min = 0  //60
        let hour = 0 //3600
        let day = 0 // 86400
        let time = moment("2018-04-01 23:58:58")
        let origtime = time.clone()
        let newtime = null
        let lastTimeLogged = ""
        let data = 1
        for(hour = 0 ; hour < 24 ; hour++){
            for (min = 0 ; min <60 ; min ++){
                for (sec = 0 ; sec<60 ; sec++){
                    chart.log(data,time)
                    let lastSec = chart.getLastSec()
                    assert.ok( lastSec.max == data, "Last Second max is not equal ",data,lastSec)
                    time.add(1,"seconds")
                    data++
                }
                //console.log("Minute Passed")
                let lastMin = chart.getLastMin()
                let format = chart.logMin.format
                assert.equal( lastMin.label,origtime.clone().add(min+1,"minutes").add(hour,"hours").format(format) , "Last Minute Label is not matching after "+moment.duration(sec+min*60+hour*3600, "seconds").humanize()+time.format()   )
            }
            //console.log("Hour Passed")
            let lastHour = chart.getLastHour()
            let format = chart.logHour.format
        assert.equal( lastHour.label,origtime.clone().add(min+1,"minutes").add(hour,"hours").format(format) , "Last Minute Label is not matching after "+moment.duration(sec+min*60+hour*3600, "seconds").humanize()+time.format()   )
        }
        await chart.logMin.endFileLog()
        await chart.logHour.endFileLog()
        await chart.logDay.endFileLog()
        await chart.logWeek.endFileLog()
        let lastDay = chart.getLastDay()
        let format = chart.logDay.format
        assert.equal( lastDay.label , origtime.clone().add(1,'days').format(format), "Last Day mismatch")
        assert.equal( chart.logDay.arrData[chart.logDay.maxIndex-1].label , origtime.format(format), "Last Day mismatch")
    })
    it("24 Hours test3", async ()=>{
        let f1 = await new File("template_24_hour_min.txt")
        await f1.read()
        await f1.write("test3_24_hour_min.log");
        f1 = await new File("template_24_hour_hour.txt")
        await f1.read()
        await f1.write("test3_24_hour_hour.log");
        f1 =await new File("template_24_hour_day.txt")
        await f1.read()
        await f1.write("test3_24_hour_day.log");
        f1 = await new File("template_24_hour_week.txt")
        await f1.read()
        await f1.write("test3_24_hour_week.log");
        let chart = new datalog("test3_24_hour")
        await chart.logMin.startFileLog()
        await chart.logHour.startFileLog()
        await chart.logDay.startFileLog()
        await chart.logWeek.startFileLog()
        let testchart = chart.getChartHour()
        await chart.logMin.endFileLog()
        await chart.logHour.endFileLog()
        await chart.logDay.endFileLog()
        await chart.logWeek.endFileLog()

    })
})