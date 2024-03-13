const Template = require('../../template');

class Main extends Template {
    constructor() {
        super()
        this.title = "京东互动整合"
        this.cron = "6 6 6 6 6"
        this.task = 'local'
        this.verify = 1
        this.import = ['fs', 'vm']
        this.filter = 'encryptProjectId'
    }

    async prepare() {
        try {
            let js = await this.modules.fs.readFileSync(this.dirname + '/static/vendors.683f5a61.js', 'utf-8')
            const fnMock = new Function;
            const ctx = {
                window: {addEventListener: fnMock},
                document: {
                    addEventListener: fnMock,
                    removeEventListener: fnMock,
                },
                navigator: {userAgent: 'okhttp/3.12.1;jdmall;android;version/9.5.4;build/88136;screen/1440x3007;os/11;network/wifi;'}
            };
            this.modules.vm.createContext(ctx);
            this.modules.vm.runInContext(js, ctx);
            this.smashUtils = ctx.window.smashUtils;
        } catch (e) {
        }
        let custom = this.getValue('custom')
        if (custom.length) {
            this.code = []
            for (let i of custom) {
                this.code.push(i)
            }
        }
        let urls = []
        for (let i of this.code) {
            let url = i.substring(0, 4) == 'http' ? i : `https://prodev.m.jd.com/mall/active/${i}/index.html`
            if (!urls.includes(url)) {
                urls.push(url)
            }
        }
        if (urls.length) {
            for (let url of urls) {
                let html = await this.curl({
                        url,
                        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:103.0) Gecko/20100101 Firefox/103.0",
                        cookie: this.cookies.main[0],
                        referer: "https://u.jd.com/"
                    }
                )
                if (html.includes("明星送好礼")) {
                    let d = await this.curl({
                            'url': `https://api.m.jd.com/?uuid=&client=wh5&area=16_1341_1347_44750&appid=ProductZ4Brand&functionId=showStarGiftInfo&t=1710313719813&body={"source":"star_gift"}`,
                            cookie: this.cookies.main[0],
                            referer: "https://u.jd.com/"
                        }
                    )
                    let activityId = (this.haskey(d, 'data.result.activityBaseInfo.activityId'))
                    if (activityId) {
                        this.shareCode.push({
                            encryptProjectId: d.data.result.activityBaseInfo.encryptProjectId,
                            appid: 'ProductZ4Brand',
                            activityId: d.data.result.activityBaseInfo.activityId
                        })
                    }
                }
                else {
                    let encryptProjectId = this.match(/\\"encryptProjectId\\":\\"(\w+)\\"/, html)
                    let flrs = this.match(/"paginationFlrs":"([^\"]+)"/g, html)
                    if (!encryptProjectId && flrs) {
                        let id = this.match(/active\/(\w+)/, url)
                        let floor = await this.curl({
                                'url': `https://api.m.jd.com/?client=wh5&clientVersion=1.0.0&functionId=qryH5BabelFloors`,
                                'form': `body={"activityId":"${id}","pageNum":"-1","innerAnchor":"","groupAnchor":"","innerExtId":"","hideTopFoot":"","hideHeadBar":"","multiTopTabDirect":"","innerLinkBase64":"","innerIndex":"1","focus":"","forceTop":"","addressId":"","posLng":"","posLat":"", "homeCityLng":"","homeCityLat":"","gps_area":"0_0_0_0","headId":"","headArea":"","warehouseId":"","jxppGroupid":"","jxppFreshman":"","dcId":"","babelChannel":"","mitemAddrId":"","geo":{"lng":"","lat":""},"flt":"","paginationParam":"2","paginationFlrs":"${flrs}","transParam":"","siteClient":"apple","siteClientVersion":"11.1.4","matProExt":{}}&osVersion=&d_model=`,
                            }
                        )
                        encryptProjectId = this.match(/\\"encryptProjectId\\":\\"([^\\\\]+)\\"/, this.dumps(floor))
                    }
                    let otherId = this.unique(this.matchAll([/\\"encryptProjectI\w+\\":\\"(\w+)\\"/g, /"encryptProjectI\w+":"(\w+)"/g], html))
                    if (encryptProjectId || otherId) {
                        let js = this.matchAll(/src="(.*?\.js)"/g, html).filter(d => d.includes('main.'))
                        let appid = this.match(/appid\s*:\s*"(\w+)"/, html) || 'babelh5'
                        let sourceCode = this.profile.sourceCode || 'aceaceqingzhan'
                        let enc = this.match(/"enc"\s*:\s*"(\w+)"/, html)
                        this.encParams = enc || "EEB688970D7CEBBE0E4A8E70D9A4CEE845D567BFB30E9D050540C6227BC766DBD057D54D5F798DBEE3B421FFEC3B65FA55B3BCD394F235B29DD14D0E12B5FC82"
                        if (js) {
                            for (let a of js) {
                                let jsContent = await this.curl({
                                        'url': `https:${a}`,
                                    }
                                )
                                let sc = this.match(/"(ace[a-zA-Z]+\d+)"/, jsContent)
                                if (sc) {
                                    sourceCode = sc
                                }
                                let aid = this.match(/appid\s*:\s*"(\w+)"/, jsContent)
                                if (aid) {
                                    appid = aid
                                }
                                if (sc && aid) {
                                    break
                                }
                            }
                        }
                        let projectId = this.matchAll(/"(encryptProjectI\w+)"\s*:\s*"(\w+)"/g, html)
                        if (encryptProjectId) {
                            this.shareCode.push({encryptProjectId, appid, sourceCode, projectId})
                        }
                        let otherProjectId = this.unique(this.matchAll(/\\"encryptProjectI\w+\\":\\"(\w+)\\"/g, html))
                        for (let kk of otherProjectId || []) {
                            this.shareCode.push({
                                encryptProjectId: kk, appid, sourceCode, projectId
                            })
                        }
                        for (let kk of otherId || []) {
                            this.shareCode.push({
                                encryptProjectId: kk, appid, sourceCode, projectId
                            })
                        }
                    }
                    else if (this.match(/businessh5\/([^\/]+)/, html)) {
                        let js = this.matchAll(/src="(.*?\.js)"/g, html).filter(d => d.includes('app.'))
                        if (js) {
                            let jsContent = await this.curl({
                                    'url': `https:${js[0]}`,
                                }
                            )
                            let source = this.match(/ActivitySource\s*:\s*"(\w+)"/, jsContent)
                            let functionId = this.match(/functionId\s*:\s*"(\w+)"/, jsContent)
                            if (source && functionId) {
                                let s = await this.curl({
                                        'url': `https://api.m.jd.com/?appid=ProductZ4Brand&functionId=${functionId}&t=${this.timestamp}&body={"source":"${source}"}`,
                                    }
                                )
                                if (this.haskey(s, 'data.result.activityBaseInfo')) {
                                    this.shareCode.push({
                                        encryptProjectId: s.data.result.activityBaseInfo.encryptProjectId,
                                        appid: 'ProductZ4Brand',
                                        activityId: s.data.result.activityBaseInfo.activityId
                                    })
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    async main(p) {
        switch (p.inviter.appid) {
            case "ProductZ4Brand":
                await this.tewuz(p)
                break
            default:
                await this.hudongz(p)
                break
        }
    }

    async hudongz(p) {
        let cookie = p.cookie;
        let encryptProjectId = p.inviter.encryptProjectId
        let appid = p.inviter.appid || "aceacesy20221130"
        let sourceCode = p.inviter.sourceCode || "content_ecology"
        for (let i of Array(3)) {
            var l = await this.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=queryInteractiveInfo`,
                    'form': `appid=${appid}&body={"encryptProjectId":"${encryptProjectId}","ext":{"rewardEncryptAssignmentId":null,"needNum":50},"sourceCode":"${sourceCode}"}&sign=11&t=1646206781226`,
                    cookie
                }
            )
            if (this.haskey(l, 'assignmentList')) {
                break
            }
            else {
                await this.wait(500)
            }
        }
        let lotteryId
        console.log(this.haskey(l, 'msg'))
        for (let i of this.haskey(l, 'assignmentList')) {
            if (i.completionFlag) {
                console.log(`任务已经完成: ${i.assignmentName}`)
            }
            else {
                let extraType = i.ext.extraType
                if (this.haskey(i, `ext.${i.ext.extraType}`)) {
                    let extra = i.ext[extraType]
                    if (extraType == 'sign1') {
                        let sign = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `functionId=doInteractiveAssignment&appid=${appid}&body={"encryptProjectId":"${encryptProjectId}","sourceCode":"${sourceCode}","encryptAssignmentId":"${i.encryptAssignmentId}","completionFlag":true,"itemId":"1"}`,
                                cookie
                            }
                        )
                    }
                    else if (extraType == 'assistTaskDetail') {
                        let index = parseInt(p.index) + 1
                        for (let o of Array(i.assignmentTimesLimit)) {
                            for (let k of Array(5)) {
                                let assist = await this.curl({
                                        'url': `https://api.m.jd.com/client.action?uuid=434e858e755c9b1ec6e6d6abc0348d9b6d985300&client=wh5&clientVersion=1.0.0&osVersion=11.4&networkType=wifi&ext=%7B%22prstate%22:%220%22%7D&&appid=content_ecology&functionId=doInteractiveAssignment&t=1672239456979&body={"geo":{"lng":"","lat":""},"mcChannel":0,"encryptProjectId":"${encryptProjectId}","encryptAssignmentId":"${i.encryptAssignmentId}","sourceCode":"${sourceCode}","itemId":"${extra.itemId}","actionType":0,"completionFlag":true,"ext":{"assistEncryptAssignmentId":"${i.encryptAssignmentId}","assistInfoFlag":2,"inviteId":"S76QxFElM"}}`,
                                        // 'form':``,
                                        cookie: this.cookies[this.task][index] || this.cookies.all[this.rand(0, this.cookies[this.task].length)]
                                    }
                                )
                                index++
                                console.log(assist)
                                if (this.haskey(assist, 'msg', '任务完成')) {
                                    break
                                }
                            }
                        }
                    }
                    else {
                        try {
                            for (let j of extra) {
                                let body = await this.body(
                                    {
                                        encryptProjectId,
                                        "encryptAssignmentId": i.encryptAssignmentId,
                                        "itemId": j.itemId || j.advId,
                                        sourceCode
                                    }
                                )
                                if (extraType == 'shoppingActivity') {
                                    let d = await this.curl({
                                            'url': `https://api.m.jd.com/client.action?functionId=doInteractiveAssignment`,
                                            'form': `appid=${appid}&body=${this.dumps(await this.body(
                                                {
                                                    encryptProjectId,
                                                    "encryptAssignmentId": i.encryptAssignmentId,
                                                    "itemId": j.itemId || j.advId,
                                                    sourceCode, "actionType": 1,
                                                }
                                            ))}&sign=11&t=1653132222710`,
                                            cookie
                                        }
                                    )
                                    await this.wait((i.ext.waitDuration || 0) * 1000)
                                }
                                let s = await this.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=doInteractiveAssignment`,
                                        'form': `appid=${appid}&body=${this.dumps(body)}&sign=11&t=1653132222710`,
                                        cookie
                                    }
                                )
                                console.log(i.assignmentName, s.msg)
                                if (this.haskey(s, 'msg', '风险等级未通过')) {
                                    return
                                }
                            }
                        } catch (e) {
                        }
                    }
                }
                else {
                    if (i.assignmentName == '积分抽奖赢好礼') {
                        lotteryId = i.encryptAssignmentId
                    }
                }
            }
        }
        let gifts = []
        if (lotteryId) {
            for (let i = 0; i<30; i++) {
                let body = await this.body(
                    {
                        encryptProjectId,
                        "encryptAssignmentId": lotteryId,
                        "completionFlag": true,
                        "ext": {"exchangeNum": 1},
                        sourceCode
                    }
                )
                let r = await this.curl({
                        'url': `https://api.m.jd.com/client.action?functionId=doInteractiveAssignment`,
                        'form': `appid=${appid}&body=${this.dumps(body)}&sign=11&t=1646207845798`,
                        cookie
                    }
                )
                if (!r) {
                    break
                }
                else if (['风险等级未通过', "未登录", '兑换积分不足', '场景不匹配', '活动太火爆了'].includes(r.msg)) {
                    console.log(r.msg)
                    break
                }
                if (this.haskey(r, 'rewardsInfo.successRewards')) {
                    for (let g in r.rewardsInfo.successRewards) {
                        let data = r.rewardsInfo.successRewards[g]
                        console.log(data)
                        for (let k of data) {
                            gifts.push(k.rewardName)
                        }
                    }
                }
                else {
                    console.log(`什么也没有抽到`)
                }
            }
        }
        if (p.inviter.projectId.length>0) {
            for (let i of p.inviter.projectId) {
                l = await this.curl({
                        'url': `https://api.m.jd.com/client.action?functionId=queryInteractiveInfo`,
                        'form': `appid=${appid}&body={"encryptProjectId":"${i[1]}","ext":{"rewardEncryptAssignmentId":null,"needNum":50},"sourceCode":"${sourceCode}"}&sign=11&t=1646206781226`,
                        cookie
                    }
                )
                if (this.haskey(l, 'assignmentList') && l.assignmentList.length == 1) {
                    for (let kk of Array(10)) {
                        let r = await this.curl({
                                'url': `https://api.m.jd.com/client.action?uuid=60f0226f67be77007d7dc5817801e282dda1211e&client=wh5&clientVersion=1.0.0&osVersion=15.6.1&networkType=wifi&ext=%7B%22prstate%22:%220%22%7D&appid=${appid}&functionId=doInteractiveAssignment&body={"geo":{"lng":"","lat":""},"mcChannel":0,"encryptProjectId":"${i[1]}","encryptAssignmentId":"${l.assignmentList[0].encryptAssignmentId}","sourceCode":"${sourceCode}","itemId":"","actionType":"","completionFlag":true,"ext":{"exchangeNum":1}}`,
                                cookie,
                                form: "",
                            }
                        )
                        if (!r) {
                            break
                        }
                        else if (['风险等级未通过', "未登录", '兑换积分不足', '场景不匹配'].includes(r.msg)) {
                            console.log(r.msg)
                            break
                        }
                        if (this.haskey(r, 'rewardsInfo.successRewards')) {
                            for (let g in r.rewardsInfo.successRewards) {
                                let data = r.rewardsInfo.successRewards[g]
                                for (let k of data) {
                                    console.log('获得:', k.rewardName)
                                    gifts.push(k.rewardName)
                                }
                            }
                        }
                        else {
                            console.log(`什么也没有抽到`)
                        }
                    }
                }
            }
        }
        if (gifts.length>0) {
            this.notices(gifts.join("\n"), p.user)
        }
    }

    async tewuz(p) {
        let cookie = p.cookie;
        let list = await this.curl({
                'url': `https://api.m.jd.com/?uuid=&client=wh5&appid=ProductZ4Brand&functionId=superBrandTaskList&t=1649852207375&body={"source":"star_gift","activityId":${p.inviter.activityId}}`,
                cookie
            }
        )
        let lotteryId
        let gifts = []
        let encryptProjectId = p.inviter.encryptProjectId
        let appid = p.inviter.appid
        if (this.haskey(list, 'data.bizMsg', '风控')) {
            console.log(p.user, '风控')
            return
        }
        for (let i of this.haskey(list, 'data.result.taskList')) {
            if (i.completionFlag) {
                console.log(`任务已经完成: ${i.assignmentName}`)
            }
            else {
                let extraType = i.ext.extraType
                if (this.haskey(i, `ext.${i.ext.extraType}`)) {
                    let extra = i.ext[extraType]
                    for (let j of extra) {
                        let s = await this.curl({
                                url: `https://api.m.jd.com/?uuid=&client=wh5&appid=ProductZ4Brand&functionId=superBrandDoTask&t=${this.timestamp}&body={"source":"star_gift","activityId":${p.inviter.activityId},"encryptProjectId":"${p.inviter.encryptProjectId}","encryptAssignmentId":"${i.encryptAssignmentId}","assignmentType":1,"itemId":"${j.advId || j.itemId}","actionType":1}`,
                                cookie
                            }
                        )
                        if (i.ext.waitDuration) {
                            console.log(`等待: ${i.ext.waitDuration}s`)
                            await this.wait(i.ext.waitDuration * 1000)
                            s = await this.curl({
                                    url: `https://api.m.jd.com/?uuid=&client=wh5&appid=ProductZ4Brand&functionId=superBrandDoTask&t=${this.timestamp}&body={"source":"star_gift","activityId":${p.inviter.activityId},"encryptProjectId":"${p.inviter.encryptProjectId}","encryptAssignmentId":"${i.encryptAssignmentId}","assignmentType":1,"itemId":"${j.advId || j.itemId}","actionType":0}`,
                                    cookie
                                }
                            )
                            console.log(s)
                        }
                        else {
                            console.log(i.assignmentName, this.haskey(s, 'data.bizMsg'))
                        }
                    }
                }
                else {
                    if (i.assignmentName.includes("抽奖")) {
                        lotteryId = i.encryptAssignmentId
                    }
                }
            }
        }
        if (lotteryId) {
            let r = await this.curl({
                    'url': `https://api.m.jd.com/?uuid=&client=wh5&appid=ProductZ4Brand&functionId=superBrandTaskLottery&t=${this.timestamp}&body={"source":"star_gift","activityId":${p.inviter.activityId},"encryptProjectId":"${p.inviter.encryptProjectId}"}`,
                    cookie
                }
            )
            if (this.haskey(r, 'data.result.rewards')) {
                for (let g in r.data.result.rewards) {
                    let data = r.data.result.rewards[g]
                    this.print(`获得京豆: ${data.beanNum}`, p.user)
                    gifts.push(data.beanNum)
                }
            }
            else {
                console.log(`什么也没有抽到`)
            }
        }
        if (gifts.length>0) {
            this.notices(gifts.join("\n"), p.user)
        }
    }

    async body(params) {
        let random = this.smashUtils.getRandom(8)
        let log = this.smashUtils.get_risk_result({
            id: random,
            data: {
                random
            }
        }).log;
        let b = {
            "extParam": {
                "forceBot": "1",
                "businessData": {"random": random},
                "signStr": log,
            },
            "enc": this.encParams
        }
        return {...b, ...params}
    }
}

module.exports = Main;
