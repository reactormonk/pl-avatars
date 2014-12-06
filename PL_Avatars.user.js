// ==UserScript==
// @name        PL Avatars
// @namespace   plAv
// @description Adds Eve avatars to the PL forum
// @include     https://www.pandemic-legion.com/forums/*
// @version     1.1
// @grant       GM_xmlhttpRequest
// @require        https://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js
// ==/UserScript==

var scrub_fix = function(elem) { if(elem === "Xeno Szeen") { return "Xeno Szenn" } else { return elem } }
var scrub_unfix = function(elem) { if(elem === "Xeno Szenn") { return "Xeno Szeen" } else { return elem } }

var onlyUnique = function(value, index, self) { 
    return self.indexOf(value) === index;
}

var eve_request = function(endpoint, data, callback) {
    // console.log("curl https://api.eveonline.com/eve/" + endpoint + ' --data "' + data + '"')
    GM_xmlhttpRequest({
        method: 'POST',
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        url: 'https://api.eveonline.com/eve/' + endpoint,
        data: data,
        onload: callback
    });
}

var fetch_names = function (names, callback) {
    var names = names.map(scrub_fix).filter(onlyUnique)     // Some API bug on CCP side.
    eve_request("CharacterID.xml.aspx", "names=" + names.join(','), callback)
};

var fetch_info = function (id, callback) {
    eve_request("CharacterInfo.xml.aspx", "characterID=" + id, callback)
}

var insert_avatar = function(image, userinfo) {
    image.insertAfter(userinfo.find('.username_container'));
}

// Fetches additional info for corp/alliance
var processCorp = function(charId) {
    if ($(".jsAvatar").filter(function (index, element) {
        // Is there such an avatar and does it not yet have corp images?
        return ($(element).attr("data-charid") == charId && !$(element).find("corp").length)
    }).length != 0) {
        fetch_info(charId, function (response) {
            var parsed = $($($.parseXML(response.responseText)).find('result'));
            var corpId = parsed.find("corporationID").text()
            var allianceId = parsed.find("allianceID").text()
            var avatars = $(".jsAvatar").filter(function (index, element) {
                return ($(element).attr("data-charid") == charId)
            });
            avatars.append('<img style="position: absolute; left: 2px; bottom: 2px;" class="corp" src="https://image.eveonline.com/Corporation/' + corpId + '_32.png"/>')
            if (allianceId) {
                avatars.append('<img style="position: absolute; right: -2px; bottom: 2px;" class="alliance" src="https://image.eveonline.com/Alliance/' + allianceId + '_32.png"/>')
            }
        });
    };
}

// Fetches names and places images.
var processNames = function() {
    var names = [];

    $('.userinfo').each(function () {
        names.push($(this).find('strong').text());
    });

    fetch_names(names, function (response) {
        var name_to_pic = {}
        var nameId = $($.parseXML(response.responseText)).find('row').map(function() {
            return {id: $(this).attr('characterID'), name: $(this).attr('name')};
        });
        nameId.each(function () {
            name_to_pic[scrub_unfix(this.name).toLowerCase()] = '<div class="jsAvatar" style="position: relative; display: inline-block;" data-charid="' + this.id + '"> <img class="avatar" src="https://image.eveonline.com/Character/' + this.id + '_128.jpg"/></div>'
        });

        $('.userinfo').each(function () {
            // If there is already an avatar, use that one.
            if(!$(this).find('a.postuseravatar').length && !$(this).find('.jsAvatar').length) {
                insert_avatar($(name_to_pic[$(this).find('strong').text().toLowerCase()]), $(this))
            } else {
                insert_avatar($(this).find('a.postuseravatar'), $(this));
            }
            // Removes the additional information, such as kills etc.
            $(this).find("dl.userinfo_extra").remove()
        });

        nameId.each(function() {processCorp(this.id)});
    });
}

processNames()

var obs = new MutationObserver(function (mutation, options) {
    var id = mutation[0].target.id
    // First is on edit, second on quick reply.
    if (id == "posts" || id == "cke_contents_vB_Editor_QR_editor") {
        processNames()
    }
});
obs.observe(document.getElementsByClassName("body_wrapper")[0], {childList: true, subtree: true})
