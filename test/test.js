var assert = require("assert")
var moment = require("moment")
var datalog = require("../index.js")
var data = []  // 60 seconds of data [1,3,5,119] averaging 60

describe("Main Test" , ()=>{
    before("Setup Test Directory", async ()=>{
        for(let i=1; i<=60 ; i++){
            data.push(i*2-1)
        }
    })

    it("single data test", (done)=>{
        let d = new datalog("Basement")
        let c = 1
        let minutes = 0
        let timeLive = moment("2000-01-01T01:00:00")

        d.log(1,timeLive)
        assert.equal(d.getChartSecTime(59),"2000-01-01 01:00:00")
        assert.equal(d.getChartSecTime(58),"")
        done()
    })
    it("3 data same time different average", (done)=>{
        let d = new datalog("Basement")
        let c = 1
        let minutes = 0
        let timeLive = moment("2000-01-01T01:00:00")

        d.log(1,timeLive)
        d.log(2,timeLive)
        d.log(3,timeLive)
        assert.equal(d.getChartSecTime(59),"2000-01-01 01:00:00")
        assert.equal(d.getChartSecData(59)[0],3)
        assert.equal(d.getChartSecData(59)[1],2)
        assert.equal(d.getChartSecData(59)[2],1)
        assert.equal(d.getChartSecTime(58),"")
        assert.equal(d.getChartSecData(58)[0],0)
        assert.equal(d.getChartSecData(58)[1],0)
        assert.equal(d.getChartSecData(58)[2],0)
        done()
    })
    it("6 data same 2 times different average", (done)=>{
        let d = new datalog("Basement")
        let c = 1
        let minutes = 0
        let timeLive = moment("2000-01-01T01:00:00")
        d.log(1,timeLive)
        d.log(2,timeLive)
        d.log(3,timeLive)
        timeLive = moment("2000-01-01T01:00:01")
        d.log(4,timeLive)
        d.log(5,timeLive)
        d.log(6,timeLive)
        assert.equal(d.getChartSecTime(59),"2000-01-01 01:00:01") 
        assert.equal(d.getChartSecData(59)[0],6)
        assert.equal(d.getChartSecData(59)[1],5)
        assert.equal(d.getChartSecData(59)[2],4)
        assert.equal(d.getChartSecTime(58),"2000-01-01 01:00:00")
        assert.equal(d.getChartSecData(58)[0],3)
        assert.equal(d.getChartSecData(58)[1],2)
        assert.equal(d.getChartSecData(58)[2],1)
        done()
    })
    it("1 minute test from 0 to 59", (done)=>{
        let d = new datalog("Basement")
        let c = 1
        let minutes = 0
        let timeLive = moment("2000-01-01T01:00:00")

        for(let m=0 ; m <= minutes ; m++){
            for(let i in data){
                d.log(data[i]+m,timeLive)
                timeLive.add(1,"seconds")
            }
        }

        assert.equal(d.getChartSecTime(59),"2000-01-01 01:00:59") 
        assert.equal(d.getChartSecData(59)[1],119)
        assert.equal(d.getChartSecTime(58),"2000-01-01 01:00:58")
        assert.equal(d.getChartSecData(58)[1],117)
        done()
    }).timeout(15000);
    it("1 minute test from 57 to 56", (done)=>{

        let d = new datalog("Basement")
        let c = 1
        let minutes = 0
        let timeLive = moment("2000-01-01T01:00:57")

        for(let m=0 ; m <= minutes ; m++){
            for(let i in data){
                d.log(data[i]+m,timeLive)
                timeLive.add(1,"seconds")
            }
        }

        assert.equal(d.getChartSecTime(59),"2000-01-01 01:01:56") 
        assert.equal(d.getChartSecData(59)[1],119)
        assert.equal(d.getChartSecTime(58),"2000-01-01 01:01:55")
        assert.equal(d.getChartSecData(58)[1],117)
        assert.equal(d.getChartMinTime(59),"2000-01-01 01:00:00") 
        assert.equal(d.getChartMinData(59)[0],5)
        assert.equal(d.getChartMinData(59)[1],3)
        assert.equal(d.getChartMinData(59)[2],1)
        done()
    }).timeout(15000);
    it("2 minute test from 57 to 56", (done)=>{
        let d = new datalog("Basement")
        let c = 1
        let minutes = 2
        let timeLive = moment("2000-01-01T01:00:57")

        for(let m=0 ; m < minutes ; m++){
            for(let i in data){
                d.log(data[i]+m,timeLive)
                timeLive.add(1,"seconds")
            }
        }

        assert.equal(d.getChartSecTime(59),"2000-01-01 01:02:56") 
        assert.equal(d.getChartSecData(59)[1],120)
        assert.equal(d.getChartSecTime(58),"2000-01-01 01:02:55")
        assert.equal(d.getChartSecData(58)[1],118)
        assert.equal(d.getChartMinTime(59),"2000-01-01 01:01:00") 
        assert.equal(d.getChartMinTime(58),"2000-01-01 01:00:00") 
        assert.equal(d.getChartMinData(59)[0],119)
        assert.equal(d.getChartMinData(59)[2],2)
        done()
    }).timeout(15000);
    it("2 minute test from 00 to 59 +1", (done)=>{
        let d = new datalog("Basement")
        let c = 1
        let minutes = 2
        let timeLive = moment("2000-01-01T01:00:00")

        for(let m=0 ; m < minutes ; m++){
            for(let i in data){
                d.log(data[i]+m,timeLive)
                timeLive.add(1,"seconds")
            }
        }
        d.log(1,timeLive)
        assert.equal(d.getChartSecTime(59),"2000-01-01 01:02:00") 
        //assert.equal(d.getChartSecData(59)[1],120)
        //assert.equal(d.getChartSecTime(58),"2000-01-01 01:00:59")
        //assert.equal(d.getChartSecData(58)[1],118)
        assert.equal(d.getChartMinTime(59),"2000-01-01 01:01:00") 
        //assert.equal(d.getChartMinTime(58),"2000-01-01 01:00:00") 
        assert.equal(d.getChartMinData(59)[0],120)
        assert.equal(d.getChartMinData(59)[2],2)
        assert.equal(d.getChartMinData(58)[0],119)
        assert.equal(d.getChartMinData(58)[2],1)
        done()
    }).timeout(15000);
    it("1 Hour test from 00 to 59+1", (done)=>{
        let d = new datalog("Basement")
        let c = 1
        let minutes = 60
        let timeLive = moment("2000-01-01T01:00:00")

        for(let m=0 ; m < minutes ; m++){
            for(let i in data){
                d.log(data[i]+m,timeLive)
                timeLive.add(1,"seconds")
            }
        }
        d.log(1,timeLive) // extra second to turn hour
        //assert.equal(d.getChartSecTime(59),"2000-01-01 01:02:56") 
        //assert.equal(d.getChartSecData(59)[1],120)
        //assert.equal(d.getChartSecTime(58),"2000-01-01 01:02:55")
        //assert.equal(d.getChartSecData(58)[1],118)
        //assert.equal(d.getChartMinTime(59),"2000-01-01 01:01:00") 
        assert.equal(d.getChartMinTime(59),"2000-01-01 01:59:00") 
        assert.equal(d.getChartHourTime(59),"2000-01-01 01:00") 
        assert.equal(d.getChartMinData(0)[1],minutes)
        assert.equal(d.getChartMinData(59)[1],2*minutes-1)
        assert.equal(d.getChartHourData(59)[0],178)
        assert.equal(d.getChartHourData(59)[2],1)
        assert.equal(d.getChartHourData(59)[1],89.5)
        done()
    }).timeout(15000);
    it("Final Test", (done)=>{
        let d = new datalog("Basement")
        let timeLive = moment("2000-01-01T01:00:00")

        for(let m=1 ; m <= 86401 ; m++){
            if (m == 5000){
                d.log(99999,timeLive)
                timeLive.add(1,"seconds")
                continue
            }
            if (m == 5001){
                d.log(-1,timeLive)
                timeLive.add(1,"seconds")
                continue
            }
            d.log(m,timeLive)
            timeLive.add(1,"seconds")
            if (m == 61){
                assert.equal(d.getChartMinTime(59),"2000-01-01 01:00:00")
                assert.equal(d.getChartMinData(59)[0],60)
                assert.equal(d.getChartMinData(59)[1],30.5)
                assert.equal(d.getChartMinData(59)[2],1)
            }
            if (m == 121){
                assert.equal(d.getChartMinTime(59),"2000-01-01 01:01:00")
                assert.equal(d.getChartMinData(59)[0],120)
                assert.equal(d.getChartMinData(59)[1],90.5)
                assert.equal(d.getChartMinData(59)[2],61)
            }
            if (m == 3601){
                assert.equal(d.getChartMinTime(59),"2000-01-01 01:59:00")
                assert.equal(d.getChartHourTime(59),"2000-01-01 01:00")
                assert.equal(d.getChartMinData(59)[0],3600)
                assert.equal(d.getChartMinData(59)[2],3541)
            }
            if (m == 86401){
                assert.equal(d.getChartMinTime(59),"2000-01-02 00:59:00")
                assert.equal(d.getChartHourTime(59),"2000-01-02 00:00")
                assert.equal(d.getChartDayTime(59),"2000-01-01 Sat")
                assert.equal(d.getChartDayData(59)[0],99999)
                assert.equal(d.getChartDayData(59)[2],-1)            
            }
        }
        done()
    }).timeout(15000);
})