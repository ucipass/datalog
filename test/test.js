var chai = require('chai');  
var assert = chai.assert;    // Using Assert style
var expect = chai.expect;    // Using Expect style
var should = chai.should();  // Using Should style
const fs = require("fs")
const path = require("path")
const appRoot = require("app-root-path").path
const decompress = require("decompress")
var util = require("util")
var File = require("ucipass-file")
var moment = require("moment")
var Datalog = require("../index.js")
const readdir = util.promisify(fs.readdir) 
const setTimeoutPromise = util.promisify(setTimeout);
const dir = path.join(appRoot)
const winston = require("winston")
const _ = require("lodash")
const readLastLines = require('read-last-lines');

describe("Quick Utility Tests" , ()=>{
    it("Read last 60 lines ", async()=>{
        let filename = path.join(appRoot,"test60.txt")
        let f = new File(filename)
        let s = ""
        for(let i=0; i <200; i++){
            s = s + "line"+ i.toString()+"\n"
        }
        await f.writeString(s)
        let lines = await readLastLines.read(filename, 122)
        linenumber = lines.split(/\r?\n/).length
        await f.unlink()
        let result = linenumber <130
        assert.isTrue(result)
    })
    it("Quicktest lodash defaults", ()=>{
        var json1 = { a:1,b:2,c:3}
        var json2 = { a:11,b:11,c:11}
        assert.equal( json1, _.defaults(json1,json2))
    })
    it("Quicktest Array", ()=>{
        var arr = new Array(5).fill({a:1,b:2})
        assert.equal( arr.length, 5)
    })
    it("Quicktest Terniary Function", ()=>{
        var test = 
            false ? 1 :
            false ? 2 :
            false ? 3 : 
            4
        assert.equal( 4, test)
    })
    it("Quicktest Moment.js", ()=>{
        let time1 = moment("2000-10-10 10:00:00")
        let time2 = moment("2000-10-10 10:00:00","YYYY-MM-DD HH:mm:ss")
        expect(time1)         .to.deep.not.equal(time2)
        expect(time1.format()).to.deep    .equal(time2.format())
    })
})

describe("Datalog Main Logging Test" , async ()=>{
    it("Read back only the last 60 items", async ()=>{
        let name = "year"
        let logdir = path.join (appRoot,"log")
        let zipfile = path.join(appRoot,"datalog.zip")
        await decompress(zipfile,logdir )
        let logSec = new Datalog({logdir:logdir,format:"seconds",name:name,logEnabled:false})
        let logMin = new Datalog({logdir:logdir,format:"minutes",name:name})
        let logHour = new Datalog({logdir:logdir,format:"hours",name:name})
        let logDay = new Datalog({logdir:logdir,format:"days",name:name})
        let logWeek = new Datalog({logdir:logdir,format:"weeks",name:name})
        let lastMin = await logMin.readFileLog()
        let lastHour = await logHour.readFileLog()
        let lastDay = await logDay.readFileLog()
        let lastWeek = await logWeek.readFileLog()
        expect(lastMin[59].label).to.deep.equal("2000-12-31 09:58:00")
        expect(lastHour[59].label).to.deep.equal("2000-12-31 08:00:00")
        expect(lastDay[59].label).to.deep.equal("2000-12-30 Sat")
        expect(lastWeek[59].label).to.deep.equal("2000 53rd week")
        lastMin.forEach(line => {
            logHour.log(line.avg, moment(line.label,logHour.format))
        });
        lastHour.forEach(line => {
            logDay.log(line.avg, moment(line.label,logDay.format))
        });
        lastDay.forEach(line => {
            logWeek.log(line.avg, moment(line.label,logWeek.format))
        });
    }).timeout(5000);
    it("Combined Test 10x sec,min,hour,day,week", async ()=>{
        let logdir = path.join(appRoot,"log")
        let name = "testcombi"
        fs.readdirSync(logdir).forEach((file)=>{
            if( file.startsWith("datalog_testcombi")) fs.unlinkSync(path.join(logdir, file))
        })
        let logSec = new Datalog({format:"seconds",name:"testcombi"})
        let logMin = new Datalog({format:"minutes",name:"testcombi"})
        let logHour = new Datalog({format:"hours",name:"testcombi"})
        let logDay = new Datalog({format:"days",name:"testcombi"})
        let logWeek = new Datalog({format:"weeks",name:"testcombi"})
        function log(value,time){
            logSec.log(value,time)
            logMin.log(value,time)
            logHour.log(value,time)
            logDay.log(value,time)
            logWeek.log(value,time)
        }
        let counter = 10
        let time = moment("2000-01-01 10:00:00","YYYY-MM-DD HH:mm:ss")
        for(i=1 ; i<= counter; i++){
            log(i,time)
            time.add(1,"seconds")
        }
        for(i=1 ; i<= counter; i++){
            log(i,time)
            time.add(1,"minutes")
        }
        for(i=1 ; i<= counter; i++){
            log(i,time)
            time.add(1,"hours")
        }
        for(i=1 ; i<= counter; i++){
            log(i,time)
            time.add(1,"days")
        }
        for(i=1 ; i<= counter; i++){
            log(i,time)
            time.add(1,"weeks")
        }
        await setTimeoutPromise(1000)
        let numSec = logSec.readMemLog().filter( (item)=> item.label != null )
        let numMin = logMin.readMemLog().filter( (item)=> item.label != null )
        let numHour = logHour.readMemLog().filter( (item)=> item.label != null )
        let numDay = logDay.readMemLog().filter( (item)=> item.label != null )
        let numWeek = logWeek.readMemLog().filter( (item)=> item.label != null )
        //expect(numSec.length).to.equal(50)
        //expect(numMin.length).to.equal(40)
        //expect(numHour.length).to.equal(30)
        //expect(numDay.length).to.equal(20)
        expect(numWeek.length).to.equal(12) // 10 Days added spanned 2 more weeks from Sat,Sun,Mon...,Sat,Sun,Mon
        return true
    })
    it("log 60x1 seconds times", async ()=>{
        var datalog = new Datalog()
        if(fs.existsSync(datalog.filename)) {fs.unlinkSync(datalog.filename);};
        let counter = 61
        let time = moment()
        let start = moment().clone()
        for(i=1 ; i<= counter; i++){
            datalog.log(i,time)
            time.add(1,"seconds")
        }
        await setTimeoutPromise(1000)
        let datalog2 = new Datalog()
        await datalog2.readFileLog()
        let log1 = datalog.readMemLog()[58]
        let log2 = datalog2.readMemLog()[59]
        let result = _.isEqual(log1,log2)
        expect(result).to.equal(true)
    })
    it("log 60x1 minutes times", async ()=>{
        var datalog = new Datalog({format:"minutes"})
        let datalog2 = new Datalog({format:"minutes"})
        if(fs.existsSync(datalog.filename)) {fs.unlinkSync(datalog.filename);};
        let counter = 61
        let time = moment()
        let start = moment().clone()
        for(i=1 ; i<= counter; i++){
            datalog.log(i,time)
            time.add(1,"minutes")
        }
        await setTimeoutPromise(1000)
        await datalog2.readFileLog()
        let log1 = datalog.readMemLog()[58]
        let log2 = datalog2.readMemLog()[59]
        expect(log1).to.deep.equal(log2)
    })
    it("log 60x1 hours times", async ()=>{
        var datalog = new Datalog({format:"hours"})
        let datalog2 = new Datalog({format:"hours"})
        if(fs.existsSync(datalog.filename)) {fs.unlinkSync(datalog.filename);};
        let counter = 61
        let time = moment()
        let start = moment().clone()
        for(i=1 ; i<= counter; i++){
            datalog.log(i,time)
            time.add(1,"hours")
        }
        await setTimeoutPromise(1000)
        await datalog2.readFileLog()
        let log1 = datalog.readMemLog()[58]
        let log2 = datalog2.readMemLog()[59]
        expect(log1).to.deep.equal(log2)
    })
    it("log 60x1 days times", async ()=>{
        var datalog = new Datalog({format:"days"})
        let datalog2 = new Datalog({format:"days"})
        if(fs.existsSync(datalog.filename)) {fs.unlinkSync(datalog.filename);};
        let counter = 61
        let time = moment()
        let start = moment().clone()
        for(i=1 ; i<= counter; i++){
            datalog.log(i,time)
            time.add(1,"days")
        }
        await setTimeoutPromise(1000)
        await datalog2.readFileLog()
        let log1 = datalog.readMemLog()[58]
        let log2 = datalog2.readMemLog()[59]
        expect(log1).to.deep.equal(log2)
    })
    it("log 60x1 weeks times", async ()=>{
        var datalog = new Datalog({format:"weeks"})
        let datalog2 = new Datalog({format:"weeks"})
        if(fs.existsSync(datalog.filename)) {fs.unlinkSync(datalog.filename);};
        let counter = 61
        let time = moment()
        let start = moment().clone()
        for(i=1 ; i<= counter; i++){
            datalog.log(i,time)
            time.add(1,"weeks")
        }
        await setTimeoutPromise(1000)
        await datalog2.readFileLog()
        let log1 = datalog.readMemLog()[58]
        let log2 = datalog2.readMemLog()[59]
        expect(log1).to.deep.equal(log2)
    })

})

