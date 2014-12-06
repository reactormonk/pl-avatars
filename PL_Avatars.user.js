// ==UserScript==
// @name        PL Avatars
// @namespace   plAv
// @description Adds Eve avatars to the PL forum
// @include     https://www.pandemic-legion.com/forums/*
// @version     1
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

var names = [];

$('.userinfo').each(function () {
    names.push($(this).find('strong').text());
});

// Fetches name -> id mapping, so the correct images can be looked up
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
        if(!$(this).find('a.postuseravatar').length) {
            insert_avatar($(name_to_pic[$(this).find('strong').text().toLowerCase()]), $(this))
        } else {
            insert_avatar($(this).find('a.postuseravatar'), $(this));
        }
        // Removes the additional information, such as kills etc.
        $(this).find("dl.userinfo_extra").remove()
    });

    // Fetches additional info for corp/alliance
    nameId.each(function() {
        var id = this.id
        fetch_info(id, function (response) {
            var parsed = $($($.parseXML(response.responseText)).find('result'));
            var corpId = parsed.find("corporationID").text()
            var allianceId = parsed.find("allianceID").text()
            var avatars = $(".jsAvatar").filter(function (index, element) {
                return ($(element).attr("data-charid") == id)
            });
            avatars.append('<img style="position: absolute; left: 2px; bottom: 2px;" src="https://image.eveonline.com/Corporation/' + corpId + '_32.png"/>')
            if (allianceId) {
                avatars.append('<img style="position: absolute; right: -2px; bottom: 2px;" src="https://image.eveonline.com/Alliance/' + allianceId + '_32.png"/>')
            }
        });
    });
});
