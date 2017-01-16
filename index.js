/*(function() {
    var childProcess = require("child_process");
    var oldSpawn = childProcess.spawn;
    function mySpawn() {
        console.log('spawn called');
        console.log(arguments);
        var result = oldSpawn.apply(this, arguments);
        return result;
    }
    childProcess.spawn = mySpawn;
})();*/
var express = require('express');
var watch = require('watch');
var probe = require('node-ffprobe');
var util = require("util");
var wav = require('wav');
var schedule = require('node-schedule');

var mkdirp = require('mkdirp');
var app = express(),
    http = require('http'),
    server = http.createServer(app);
var WebSocketServer = require('websocket').server;
//  io = require('socket.io').listen(server);
//var WebSocketServer = require('ws').Server;

var csv = require('csv');
var sys = require('sys');
var fs = require('fs');
var path = require('path');
var config = require('./config.json');
var mongo = require('mongodb');
var BSON = mongo.BSONPure;
var Db = mongo.Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server;
var passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy;
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var multer = require('multer');
var upload = multer({
    dest: config.uploadDirectory
});


var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;
var scanner = new Db('scanner', new Server(host, port, {}));
var db;
var channels = {};
var clients = [];
var stats = {};
var affiliations = {};
var sources = {};
var source_names = {};


scanner.open(function (err, scannerDb) {
    db = scannerDb;
    scannerDb.authenticate(config.dbUser, config.dbPass, function () {
        //do the initial build of the stats
        db.collection('call_volume', function (err, collection) {
            build_stat(collection);
        });
        db.collection('source_names', function (err, collection) {
            collection.find().toArray(function (err, results) {
                for (var src in results) {
                    source_names[results[src].tg] = {
                        name: results[src].name,
                        shortName: results[src].shortName
                    };
                }

            });
        });
        build_unit_affiliation();
        db.collection('source_list', function (err, collection) {

            collection.find(function (err, cursor) {
                cursor.sort({
                    "value.total": -1
                }).toArray(function (err, results) {
                    sources = results;
                });
            });

        });
    });
});


var numResults = 50;
var talkgroup_filters = {};
/*talkgroup_filters['group-fire'] = [1616, 1632, 1648, 1680, 1696, 1712, 1744, 1760, 1776, 1808, 1824, 1840, 1872, 1888, 1904, 1920, 1936, 1952, 1968, 2000, 2016, 2048, 2064, 2080, 2096, 2112, 2128, 2144, 2160, 2176, 2192, 2224, 2240, 2272, 2288, 2304, 2320, 2336, 2352, 2368, 2384, 2400, 2416, 2432, 2448, 2464, 2480, 2496, 2512, 2592, 2608, 2640, 2720, 2736, 2752, 2848, 2864, 2880, 9808, 9824, 9840, 9872, 9984, 10032, 40000, 40032];

talkgroup_filters['group-common'] = [2656, 2672, 9936, 9968, 16624, 19248, 33616, 33648, 35536, 35568, 37456, 37488, 37648, 37680, 59952, 59968];

talkgroup_filters['group-services'] = [33840, 33872, 33904, 34128, 34192, 34288, 34320, 34352, 34384, 34416, 34448, 34480, 34512, 34576, 34608, 34672, 34800, 34832, 34864, 35024, 35056, 35088, 35152, 35184, 35216, 35248, 35408, 35440, 35600, 35664, 36880, 37040, 37200, 37232, 37328, 37456, 37488, 40080];
talkgroup_filters['tag-ops'] = [33872, 33904];
talkgroup_filters['tag-ems'] = [1904, 1920, 1936, 2720];
talkgroup_filters['tag-fire-dispatch'] = [1616, 40000, 40032];
talkgroup_filters['tag-fire'] = [1632, 1648, 1680, 1696, 1712, 1744, 1760, 1776, 1808, 1824, 1840, 1872, 1888, 1968, 2016, 2048, 2064, 2080, 2096, 2112, 2128, 2144, 2160, 2176, 2192, 2224, 2240, 2640, 2736, 2848, 2864, 2880, 9808, 9824, 9840, 9872];
talkgroup_filters['tag-hospital'] = [2272, 2288, 2304, 2320, 2336, 2352, 2368, 2384, 2400, 2416, 2432, 2448, 2464, 2480, 2496, 2512, 36880];
talkgroup_filters['tag-interop'] = [1952, 2592, 2656, 2672, 9936, 9968, 9984, 10032, 19248, 33616, 33648, 35536, 35568, 37456, 37488, 37648, 37680, 59952, 59968, 59984, 60000];
talkgroup_filters['tag-law-dispatch'] = [ 16624 ];
talkgroup_filters['tag-paratransit'] = [ 35664 ];
talkgroup_filters['tag-parks'] = [ 35248 ];
talkgroup_filters['tag-parking'] = [ 34800,34608 ];
talkgroup_filters['tag-public-works'] = [ 37328,37200,37040 ];
talkgroup_filters['tag-public-health'] = [ 34480,34448,34416,33584 ];
talkgroup_filters['tag-security'] = [37232,35440,35408,35152,34864,34832,34192,34128,33840];
talkgroup_filters['tag-st-e'] = [ 34384,34368,34352,34320,34288 ];
talkgroup_filters['tag-transportation'] = [ 40080,35632,35600,34576,34512 ];
talkgroup_filters['tag-water'] = [ 35088,35056,35024 ];*/
talkgroup_filters['tag-dispatch'] = [7207000,7207014,7207015,7207028,7207029 ];
talkgroup_filters['tag-cabarrus-law'] = [7207000,7207002,7207003,7207004,7207005,7207006,7207010,7207011,7207012,7207013,7207014,7207015,7207016,7207018,7207019,7207020,7207021,7207022,7207023,7207024,7207025,7207026,7207027,7207028,7207029,7207030,7207031 ];
talkgroup_filters['tag-cabarrus-fire'] = [7207034,7207047,7207048,7207049,7207050,7207501,7207052,7207053,7207054,7207055,7207056,7207057,7207058,7207059,7207060,7207064,7207065,7207066,7207067,7207068,7207069,7207070,7207071,7207072,7207117 ];
talkgroup_filters['tag-concord-fire'] = [7207047,7207048,7207049,7207050,7207051,7207052,7207053,7207054,7207055,7207056,7207057,7207058,7207059,7207060 ];
talkgroup_filters['tag-cabarrus-ems-fire'] = [7207034,7207035,7207036,7207037,7207038,7207039,7207040,7207041,7207042,7207043,7207044,7207045 ];
talkgroup_filters['tag-kannapolis-fire'] = [7207064,7207065,7207066,7207067,7207068,7207069,7207070,7207071,7207072 ];
talkgroup_filters['tag-cmpd-central'] = [720659,720657,720669,720815,386410544];
talkgroup_filters['tag-cabarrus-analog'] = [12301,12302,12303,12304,12305,12306,12307,12308,12309,123010];
talkgroup_filters['tag-cmpd-eastway'] = [720559,720563,720825,720823];
talkgroup_filters['tag-cmpd-freedom'] = [720533,720539,720855,720853];
talkgroup_filters['tag-cmpd-hickory_grove'] = [720561,720565,720833,720831];
talkgroup_filters['tag-cmpd-independence'] = [720547,720551,720839,720837];
talkgroup_filters['tag-cmpd-metro'] = [720661,720665,720821,720819];
talkgroup_filters['tag-cmpd-north'] = [720557,720555,720829,720567];
talkgroup_filters['tag-cmpd-north_tryon'] = [720663,720667,720827,720817];
talkgroup_filters['tag-cmpd-providence'] = [720543,720541,720835,720553];
talkgroup_filters['tag-cmpd-south'] = [720549,720549,720847,720845];
talkgroup_filters['tag-cmpd-steele_creek'] = [720529,720527,720843,720841];
talkgroup_filters['tag-cmpd-university_city'] = [720687,720685,720697,720693];
talkgroup_filters['tag-cmpd-westover'] = [720531,720535,720851,720849];
talkgroup_filters['tag-cmpd-all'] = [720659,720657,720669,720815,386410544,720559,720563,720825,720823,720533,720539,720855,720853,720561,720565,720833,720831,720547,720551,720839,720837,720661,720665,720821,720819,720557,720555,720829,720567,720663,720667,720827,720817,720543,720541,720835,720553,720545,720549,720847,720845,720529,720527,720843,720841,720687,720685,720697,720693,720531,720535,720851,720849,720129];
talkgroup_filters['tag-cmpd-dispatch'] = [720659,720559,720533,720561,720547,720661,720557,720663,720543,720545,720529,720687,720531];
talkgroup_filters['tag-cmpd-tactical'] = [720583,720585,720587,720589,720591,720593,720675,720677,720681,7201273,72030541,720815,720823,720853,720831,720837,720819,720567,720817,720553,720845,720841,720693,720849];
talkgroup_filters['tag-cmpd-swat'] = [720583,720585,720587];
talkgroup_filters['tag-cmpd-vcat'] = [720675,720677,720681];
talkgroup_filters['tag-cmpd-ceu'] = [720589,720591,720593];
talkgroup_filters['tag-cmpd-bomb_squad'] = [7201273,72030541];
talkgroup_filters['tag-meck-sheriff-all'] = [7201557,386424912,7201559,386424944,386424976,386425008,386425040,386425072,386425104,38643472,386415920,386415952,386415888,3864464,3864560,38643280,386416240,386416272,386416304,38643440,386415984,386416016,386416048,386416080,386416112,720999,7201001,386418640,386418928,386418672,386418704,386418736,386418768,386418800,386418832,386418864,386418896,386419344,3864528,386419312,3864496,38643632,38643664,38643696,38643728,720189,38643024,3864592,3864624,38643504,386419248,386419280,386419216,386416144,386416176,386416208,386416336,386416368,386418608,386419024,38643248,386419056,386419088,386419120,386419152,386419184,38643792,38643824,38643856,38643888,38643216];
talkgroup_filters['tag-meck-sheriff-dispatch'] = [7201557,386424912];
talkgroup_filters['tag-meck-sheriff-tactical'] = [7201559,386424944,386424976,386425008,386425040,386425072,386425104,386419056,386416144,386416176];
talkgroup_filters['tag-charlotte-fire-all'] = [38647440,720453,38647248,7201027,386416432,720983,720985,720987,7201029,7201031,7201033,7201035,7201037,7201039,7201041,7201057,7201059,7201061,7201063,7201065,7201067,7201069,7201071,7201073,7201075,7201085,7201087,7201089,7201091,7201093,7201095,7201097,7201099,7201101,7201103,7201105,7201107,7201301,7201303,7201305,7201309,386415728,386415760,386415792,386415856,386416464,386416496,386416528,386416560,386416592,386416624,386416656,720991,7201077,7201109,7201111,7201113,7201115,7201117,7201119,7201307,7201329];
talkgroup_filters['tag-charlotte-fire-dispatch'] = [7201027,386416432,720453,38647248];
talkgroup_filters['tag-charlotte-fire-ops'] = [38647440,720983,720985,720987,7201029,7201031,7201033,7201035,7201037,7201039,7201041,7201057,7201059,7201061,7201063,7201065,7201067,7201069,7201071,7201073,7201075,7201099,7201101,7201103,7201105,7201107,386415728,386415760,386415792,386415856,386416464,386416496,386416528,386416560,386416592,386416624,386416656,720991,7201077,7201109,7201111,7201113,7201115,7201117,7201119,7201307,7201329];
talkgroup_filters['tag-charlotte-ems-all'] = [720185,720403,720769,38646448,386412336,720415,720771,720773,38647472,720467,720405,720407,720409,720411,720413,720417,720423,720425,720427,720429,720455,720457,720459,720461,720463,720759,720761,720763,720765,720767,38642960,38646480,38646512,38646544,38646576,38646608,38646672,38646768,38646800,38646832,38647280,38647312,38647344,38647376,38647408,386412144,386412176,386412208,386412240,386412272,386412304];
talkgroup_filters['tag-charlotte-ems-dispatch'] = [720403,38646448];
talkgroup_filters['tag-charlotte-ems-ops'] = [720185,720769,386412336,720415,720771,720773,38647472,720467,720405,720407,720409,720411,720413,720417,720423,720425,720427,720429,720455,720457,720459,720461,720463,720759,720761,720763,720765,720767,38642960,38646480,38646512,38646544,38646576,38646608,38646672,38646768,38646800,38646832,38647280,38647312,38647344,38647376,38647408,386412144,386412176,386412208,386412240,386412272,386412304];
talkgroup_filters['tag-air'] = [38644336,38644368,38644592,38644624,49616514,49616521,49616523,49616524,49616525,49651542,49616522,49651539,49651533,49651597,49651598,49651599,49651600,49652127,49633007,49651535,49651543,49651544,49651545,49652339,49652340,49652341,49652342,49652371,49652466];
talkgroup_filters['tag-cats-all'] = [7202149,38641936,38643312,38643344,38643376,38646192,386411696,386427024,386427056,720735,720737,720739,720741,386411280,386411760,386411792,386411824,386411856,386434384,720207,720209,720211,720731];
talkgroup_filters['tag-cats-rail'] = [38643312,38643344,38643376,38646192,720207,720209,720211];
talkgroup_filters['tag-cats-bus'] = [720735,720737,720739,720741,386411280,386411760,386411792,386411824,386411856];
talkgroup_filters['tag-atf'] = [49660500,49660501,49660502,49660503,49660504,49660505,49660506];
talkgroup_filters['tag-dea'] = [49660594,49660595,49660596,49660597,49660598,49660599,49660600];
talkgroup_filters['tag-nc-wildlife'] = [49652093,49652095,49652097,49652099,49652101,49652103,49652105,49652107,49652109,49652087,49652088,49652089,49652090,49652094,49652096,49652098,49652100,49652102,49652104,49652106,49652108,49652110,49652578,49652579,49652580,49652581,49652582,49652583,49652584,49652585,49652586,49652587,49652588,49652091,49652092,49652112];
talkgroup_filters['tag-viper-medical'] = [49652371,49652372,49652373,49652374,49652375,49652376,49652377,49652378,49652379,49652380,49652381,49652382,49652383,49652384,49652385,49652386,49652387,49652388,49652389,49652390,49652391,49652392,49652393,49652394,49652395,49652396,49652397,49652398,49652399,49652400,49652401,49652402,49652403,49652404,49652405,49652406,49652407,49652408,49652409,49652410,49652411,49652412,49652413,49652414,49652415,49652416,49652417,49652418,49652419,49652420,49652421,49652422,49652423,49652424,49652425,49652426,49652427,49652428,49652429,49652430,49652431,49652432,49652433,49652434,49652435,49652436,49652437,49652438,49652439,49652440,49652441,49652442,49652443,49652444,49652445,49652446,49652447,49652448,49652449,49652450,49652451,49652452,49652453,49652454,49652455,49652456,49652457,49652458,49652459,49652460,49652461,49652462,49652463,49652464,49652465,49652466,49652467,49652468,49652469,49652470,49652471,49652472,49652473,49652474,49652475,49652476,49652477,49652478,49652479,49652480,49652481,49652482,49652483,49652484,49652485,49652486,49652487,49652488,49652489,49652490,49652491,49652492,49652493,49652494,49652495,49652496,49652497,49652498,49652499,49652500,49652501,49652502,49652503,49652504,49652505,49652506,49652507,49652508,49652509,49652510,49652511,49652512,49652513,49652514,49652515,49652516,49652517,49652518,49652519,49652520,49652521,49652522,49652523,49652524,49652525,49652526,49652527,49652528,49652529,49652530,49652531,49652532,49652533,49652534,49652535,49652536,49652537,49652538,49652539,49652540,49652541,49652542,49652543,49652544,49652545,49652546,49652547,49652548,49652549,49652550,49652551,49652552,49652553,49652554,49652555];
talkgroup_filters['tag-us-marshals'] = [49660666,49660667,49660668,49660669,49660670,49660671,49660672,386420432,386420592,386420624,386420656,386420688,386420720,386420752,386420784];
talkgroup_filters['tag-us-immigration-and-customs'] = [49660610,49660611,49660612,49660613,49660614,49660615,49660616,49660617,49660618,49660619];
talkgroup_filters['tag-uncc'] = [720307,720305,720309,720311,720313,720315,720299,720301,720303,720317,720319,720321,720323,38644912,38644880,38644944,38644976,38645008,38645040,38644784,38644816,38644848,38645072,38645104,38645168,38645136];
talkgroup_filters['tag-us-fish-and-wildlife'] = [49660654,49660655,49660656];
talkgroup_filters['tag-us-forestry'] = [49660643,49660644,49651987,49652654,49652655,49652656,49652657,49652658,49652659,49652660,49652661,49652662,49652663,49652664,49652665,49652666,49651990,49651991,49651988,49651989,49651992,49651993,49651994];
talkgroup_filters['tag-statewide-event'] = [49651955,49651956,49651957,49651958,49651959,49651960,49651961,49651962,49651963,49651964,49651965,49651966,49651967,49651968,49651969,49651970,49651971,49651972,49651973,49651974,49651975,49651976,49651977,49651978,49651979,49651980,49651981,49651982,49651983,49651984,49651985,49651986];
talkgroup_filters['tag-troop-a'] = [49652224,49652136,49652137,49652138,49652139,49652140,49652141,49652142,49652143,49652134,49652135,49652144];
talkgroup_filters['tag-troop-b'] = [49652225,49652147,49652148,49652149,49652150,49652151,49652152,49652153,49652154,49652145,49652146,49652155];
talkgroup_filters['tag-troop-c'] = [49652226,49652158,49652159,49652160,49652161,49652162,49652163,49652164,49652165,49652156,49652157,49652166];
talkgroup_filters['tag-troop-d'] = [9652227,49652169,49652170,49652171,49652172,49652173,49652174,49652175,49652167,49652168,49652176];
talkgroup_filters['tag-troop-e'] = [49652228,49652179,49652180,49652181,49652182,49652183,49652184,49652185,49652177,49652178,49652186];
talkgroup_filters['tag-troop-f'] = [49652229,49652189,49652190,49652191,49652192,49652193,49652187,49652188,49652194];
talkgroup_filters['tag-troop-h'] = [49652231,49652206,49652207,49652208,49652209,49652210,49652211,49652204,49652205,49652212,38642352,38642384];
talkgroup_filters['tag-troop-g'] = [49652230,49652197,49652198,49652199,49652200,49652201,49652202,49652195,49652196,49652203];
talkgroup_filters['tag-troop-all'] = [49652224,49652136,49652137,49652138,49652139,49652140,49652141,49652142,49652143,49652134,49652135,49652144,49652225,49652147,49652148,49652149,49652150,49652151,49652152,49652153,49652154,49652145,49652146,49652155,49652226,49652158,49652159,49652160,49652161,49652162,49652163,49652164,49652165,49652156,49652157,49652166,49652227,49652169,49652170,49652171,49652172,49652173,49652174,49652175,49652167,49652168,49652176,49652228,49652179,49652180,49652181,49652182,49652183,49652184,49652185,49652177,49652178,49652186,49652229,49652189,49652190,49652191,49652192,49652193,49652187,49652188,49652194,49652230,49652197,49652198,49652199,49652200,49652201,49652202,49652195,49652196,49652203,49652231,49652206,49652207,49652208,49652209,49652210,49652211,49652204,49652205,49652212,49652127,49652129,49652130,49652216,49652218,49652222];
talkgroup_filters['tag-troop-various'] = [49652127,49652129,49652130,49652216,49652218,49652222];
talkgroup_filters['tag-nc-parks'] = [49652263,49652264,49652265,49652266,49652267,49652268,49652269,49652270,49652271,49652272,49652273,49652274,49652275,49652276,49652277,49652278,49652279,49652280,49652281,49652282,49652285,49652286,49652287,49652288,49652289,49652290,49652292,49652293,49652296,49652300,49652301,49652302,49652303,49652304,49652305,49652306,49652307,49652308,49652309,49652310,49652311,49652312,49652313,49652314,49652315,49652316,49652317,49652318,49652319,49652320,49652321,49652322,49652323,49652324,49652325,49652326,49652327,49652328,49652329,49652330,49652331,49652332,49652333,49652334,49652335];
talkgroup_filters['tag-department-corrections'] = [49651615,49651616,49651617,49651618,49651619,49651620,49651621,49651624,49651625,49651626,49651627,49651628,49651629,49651630,49651631,49651633,49651635,49651637,49651638,49651639,49651641,49651643,49651644,49651645,49651646,49651647,49651648,49651649,49651650,49651651,49651653,49651654,49651655,49651656,49651657,49651658,49651659,49651661,49651662,49651664,49651665,49651666,49651667,49651668,49651669,49651670,49651671,49651672,49651673,49651674,49651675,49651676,49651677,49651678,49651679,49651680,49651681,49651682,49651683,49651684,49651685,49651686,49651687];
talkgroup_filters['tag-department-defense'] = [49660556,49660557,49660558,49660559,49660560,49660561,49660562];
talkgroup_filters['tag-domestic-preparedness'] = [49651839,49651840,49651841,49651842,49651843,49651844,49651845,49651846,49651847,49651848,49651849,49651850,49651851,49651852,49651853,49651854,49651855,49651856,49651857,49651858,49651859,49651860,49651861,49651862,49651863,49651864,49651865,49651866,49651867,49651868,49651869,49651870,49651871,49651872,49651873,49651874,49651875,49651876,49651877,49651878,49651879,49651880,49651881,49651882,49651883,49651884,49651885,49651886,49651887,49651888,49651889,49651890,49651891,49651892,49651893,49651894,49651895,49651896,49651897,49651898,49651899,49651900,49651901,49651902,49651903,49651904,49651905,49651906,49651907,49651908,49651909,49651910,49651911,49651912,49651913,49651914,49651915,49651916,49651917,49651918,49651919,49651920,49651921,49651922,49651923,49651924,49651925,49651926,49651927,49651928];
talkgroup_filters['tag-nc-dot'] = [49651691,49651692,49651710,49651713,49651714,49651720,49651722,49651750,49651793,49651794,49651795,49651796,49651797,49651798,49651799,49651800,49651801,49651802,49651803,49651804,49651805,49651806,49651807,49651808,49651809,49651810,49651811,49651812,49651813,49651814,49651815,49651816,49651817,49651818,49651819,49651820,49651821,49651822,49651823,49651824,49651825,49651826,49651827,49651828,49651829,49651830,49651831,49651832,49651833,49651834,49651835,49651836,49651837,49651838,49652083,49652084,49652085,49652086];
talkgroup_filters['tag-nc-national-guard'] = [49652027,49652028,49652029,49652030,49652031,49652032,49652033,49652034,49652035,49652036,49652037,49652038,49652039,49652040,49652041,49652042,49652043];
talkgroup_filters['tag-nc-sbi'] = [49652063,49652055,49652062,49652064,49652067,49652068,49652069,49652059,49652060,49651950];
talkgroup_filters['tag-nc-interop'] = [49657500,49657501,49657502,49657503,49657504,49657505,49651938,49651941,49651943,49651947,49651953,49652255,49652256,49652257,49652258,49652259];
talkgroup_filters['tag-nc-hart'] = [49651995,49651996,49651997,49651998,49651999,49652000,49652001,49652002,49652003,49652004,49652005,49652006,49652007,49652008,49652009,49652010];
talkgroup_filters['tag-duke'] = [49616515,49616513,49616526,49616500,49616501,49616502,49616503,49616507,49616508,49616509,49616510,49616511,49616512,49616519,49616520,49616504,49616505,49616506,49616517,49616518];
talkgroup_filters['tag-fbi'] = [49660526,49660527,49660528,49660529,49660530,49660531,49660532,49660533,49660534,49660535];
talkgroup_filters['tag-nc-license-theft'] = [49652013,49652014,49652015,49652016,49652017,49652018,49652019,49652020,49652021,49652022,49652023,49652011,49652012];
talkgroup_filters['tag-systemwide'] = [720287,720289,7201149,386418384,7201153,7201155,7201157,386418448,386418480,386418512,386419632,7201159,7201161,7201227,386418544,386418576,720187,720537,7201151,7201225,7201229,7201231,7201233,72045582,72045583,72045584,72045585,386418416,386419600,386419664,386419696,386419728,49633007,49651535,49651543,49651544,49651545,49652339,49652340,49652341,49652342,49652363,49652364,49652365,49652366,49652367,49652368,49652369,49652370,49652560,49652561,49652562,49652563];
talkgroup_filters['tag-rowan'] = [49640501,49640502,49640503,49640504,49640505,49640500];
talkgroup_filters['tag-regional-ems'] = [720421,720787,720789,720791,720793,720795,720797,720799,720801,720803,720805,720811,7207074,7207075];
talkgroup_filters['tag-radio'] = [7201679,7201681,7204063,386426864,386426896];
talkgroup_filters['tag-fairgrounds'] = [49652070,49652071,49652072];
talkgroup_filters['tag-ports-authority'] = [49652053,49652054];
talkgroup_filters['tag-nc-fire-marshal'] = [49652046,49652047,49652048,49652049,49652050];
talkgroup_filters['tag-nc-va'] = [49660679,49660680,49660681,49660682,49660683,49660684,49660685,49660686,49660687];
talkgroup_filters['tag-nc-department-agriculture'] = [49651601,49651602,49651603,49651604,49651605,49651606,49651607,49651608];
talkgroup_filters['tag-meck-cms'] = [720357,7201675,7201677,38645712,386411984,38645808,386412016,386414832,386414864,386426800,386426832];
talkgroup_filters['tag-meck-cmc'] = [38644336,38644368,38644400,38644432,38644464,38644496,38644528,38644560,38644592,38644624];
talkgroup_filters['tag-meck-water'] = [386427920,386427984,386428016,386428048,386428080,386428112,386428144,386428176,386428208,386428240,38647600,38647856,38647888];
talkgroup_filters['tag-meck-trash'] = [38647664,38647728,38647792,38647824,720489];
talkgroup_filters['tag-meck-services'] = [38643536,38643568,38643600,38644080,38644144,38644176,38644208,386410384,386425264,386426640,386433104,38642160,38644720,720337];
talkgroup_filters['tag-huntersville'] = [386415152,386415184,386415216,386415248,386415280,386426576,386426608,386426096,386426160];
talkgroup_filters['tag-federal-common'] = [49660545,49660546];
talkgroup_filters['tag-matthews'] = [386433328,38641008,38641040,38641072,38641104,38641168,38641200,38641232,7202085,72063,72073,72075,72065,72067];
talkgroup_filters['tag-davidson'] = [386415376,386426032,386426064,386426352,386426384,7201635];
talkgroup_filters['tag-mint-hill'] = [386433616,386433552,386433584,386433680,386433648,7202101];
talkgroup_filters['tag-monroe'] = [72045657,72045602,72045597,72045574];
talkgroup_filters['tag-abc'] = [386432016,386432048,386432080,7202001,7202003];
talkgroup_filters['tag-alert'] = [386434032,386434064,386434096,386434128,386434160];
talkgroup_filters['tag-meck-event-digital'] = [72041,72043,72045,72047,72049,72051,72053,72055,72057,72059,72061,720153,720155,720157,720159,720161,7201235,7201237,7201239,7201241,7201243,7201245,7201247,7201249,7201251,7201253,7201255,7201257,7201259,7201261,7201263,7201265];
talkgroup_filters['tag-meck-event-analog'] = [3864656,3864688,3864720,3864752,3864784,3864816,3864848,3864880,3864912,3864944,3864976,38642448,38642480,38642512,38642544,38642576,386419760,386419792,386419824,386419856,386419888,386419920,386419952,386419984,386420016,386420048,386420080,386420112,386420144,386420176,386420208,386420240];
talkgroup_filters['tag-cabarrus-event'] = [7207100,7207101,7207102,7207103,7207104,7207105,7207106,7207107,7207108,7207109,7207110,7207111,7207112,7207113,7207114,7207115];
talkgroup_filters['tag-meck-fire'] = [7201027,386416432,720983,720985,720987,7201029,7201031,7201033,7201035,7201037,7201039,7201041,7201057,7201059,7201061,7201063,7201065,7201067,7201069,7201071,7201073,7201075,7201085,7201087,7201089,7201091,7201093,7201095,7201097,7201099,7201101,7201103,7201105,7201107,7201301,7201303,7201305,7201309,386415728,386415760,386415792,386415856,386416464,386416496,386416528,386416560,386416592,386416624,386416656,720991,7201077,7201109,7201111,7201113,7201115,7201117,7201119,7201307,7201329,72043,72053,72055,720159,720161,7201027,386416432,720983,720985,720987,7201029,7201031,7201033,7201035,7201037,7201039,7201041,7201057,7201059,7201061,7201063,7201065,7201067,7201069,7201071,7201073,7201075,7201085,7201087,7201089,7201091,7201093,7201095,7201097,7201099,7201101,7201103,7201105,7201107,7201301,7201303,7201305,7201309,386415728,386415760,386415792,386415856,386416464,386416496,386416528,386416560,386416592,386416624,386416656,720991,7201077,7201109,7201111,7201113,7201115,7201117,7201119,7201307,7201329,38647440,720453,38647248];
talkgroup_filters['tag-meck-ems'] = [72045,38642128,720185,720403,720769,38646448,386412336,720415,720771,720773,38647472,720467,720405,720407,720409,720411,720413,720417,720423,720425,720427,720429,720455,720457,720459,720461,720463,720759,720761,720763,720765,720767,38642960,38646480,38646512,38646544,38646576,38646608,38646672,38646768,38646800,38646832,38647280,38647312,38647344,38647376,38647408,386412144,386412176,386412208,386412240,386412272,386412304];
talkgroup_filters['tag-meck-law'] = [7201235,7201237,7201239,7201241,7201243,7201245,7201247,7201249,7201251,7201253,7201255,7201257,7201259,7201261,7201263,7201265,720155,720157,72047,38642064,7201557,386424912,7201559,386424944,386424976,386425008,386425040,386425072,386425104,38643472,386415920,386415952,386415888,3864464,3864560,38643280,386416240,386416272,386416304,38643440,386415984,386416016,386416048,386416080,386416112,720999,7201001,386418640,386418928,386418672,386418704,386418736,386418768,386418800,386418832,386418864,386418896,386419344,3864528,386419312,3864496,38643632,38643664,38643696,38643728,720189,38643024,3864592,3864624,38643504,386419248,386419280,386419216,386416144,386416176,386416208,386416336,386416368,386418608,386419024,38643248,386419056,386419088,386419120,386419152,386419184,38643792,38643824,38643856,38643888,38643216,720659,720657,720669,720815,386410544,720559,720563,720825,720823,720533,720539,720855,720853,720561,720565,720833,720831,720547,720551,720839,720837,720661,720665,720821,720819,720557,720555,720829,720567,720663,720667,720827,720817,720543,720541,720835,720553,720545,720549,720847,720845,720529,720527,720843,720841,720687,720685,720697,720693,720531,720535,720851,720849,720129];
talkgroup_filters['tag-meck-fire-dispatch'] = [7201027,386416432,720453,38647248];
talkgroup_filters['tag-meck-ems-dispatch'] = [720403,38646448];
talkgroup_filters['tag-meck-law-dispatch'] = [7201557,386424912,720659,720559,720533,720561,720547,720661,720557,720663,720543,720545,720529,720687,720531];
talkgroup_filters['tag-mecklenburg-boa-stadium-all'] = [2745516,2745548,2745580,27455112,27455144,27455176,27455208,27455240,27455272,27455304,27455336,27455368,27455432,27455464,27455496,27455528,27455560,27455592,27455624,27455656,27455688,27455720,27455752,27455768];



fs.createReadStream('ChanList.csv').pipe(csv.parse({
    columns: ['Num', 'Small', 'Nac', 'Hex', 'Mode', 'Alpha', 'Description', 'Tag', 'Group', 'Priority']
})).pipe(csv.transform(function (row) {
    channels[row.Num] = {
		num: row.Num,
		small: row.Small,
        alpha: row.Alpha,
        desc: row.Description,
        tag: row.Tag,
		nac: row.Nac,
        group: row.Group
    };
    var tg_array = new Array();
    tg_array.push(parseInt(row.Num));
    talkgroup_filters['tg-' + row.Num] = tg_array;

    var tag_key = 'group-' + row.Group.toLowerCase();
    if (!(tag_key in talkgroup_filters)) {
        talkgroup_filters[tag_key] = new Array();
    }
    talkgroup_filters[tag_key].push(parseInt(row.Num));

    return row;
    // handle each row before the "end" or "error" stuff happens above
})).on('readable', function () {
    while (this.read()) {}
}).on('end', function () {
    // yay, end
}).on('error', function (error) {
    // oh no, error
});
/*
csv()
  .from.path('ChanList.csv', {
    columns: true
  })
  .to.array(function(data, count) {
    console.log("Loaded " + count + " talkgroups.");

  })
  .transform(function(row) {

    channels[row.Num] = {
      alpha: row.Alpha,
      desc: row.Description,
      tag: row.Tag,
      group: row.Group
    };
    var tg_array = new Array();
    tg_array.push(parseInt(row.Num));
    talkgroup_filters['tg-' + row.Num] = tg_array;
    return row;
  });*/

function compile(str, path) {
    return stylus(str)
        .set('filename', path)
        .use(nib())
}

function build_affiliation_array(collection) {
    affiliations = {};
    collection.find().toArray(function (err, results) {
        if (err) console.log(err);
        if (results && (results.length > 0)) {
            for (var i = 0; i < results.length; i++) {
                console.log(util.inspect(results[i]));
                affiliations[results[i]._id.tg] = results[i].value.unit_count;
            }
        }
        console.log(util.inspect(affiliations));
    });

}


function build_stat(collection) {
    var chan_count = 0;
    stats = {};
    var db_count = 0;
    for (var chan_num in channels) {
        var historic = new Array();
        chan_count++;

        for (hour = 0; hour < 24; hour++) {

            historic[hour] = 0;
        }
        stats[chan_num] = {
            name: channels[chan_num].alpha,
            desc: channels[chan_num].desc,
			small: channels[chan_num].small,
            num: chan_num,
            historic: historic
        };
        var query = {
            "_id.talkgroup": parseInt(chan_num)
        };
        collection.find(query).toArray(function (err, results) {
            db_count++;
            if (err) console.log(err);
            if (results && (results.length > 0)) {
                for (var i = 0; i < results.length; i++) {
                    stats[results[0]._id.talkgroup].historic[results[i]._id.hour] = results[i].value.count;
                }
            }
            if (chan_count == db_count) {
                for (var chan_num in stats) {
                    var chan = stats[chan_num];
                    var erase_me = true;
                    for (var i = 0; i < chan.historic.length; i++) {
                        if (chan.historic[i] != 0) {
                            erase_me = false;
                            break;
                        }
                    }
                    if (erase_me) {
                        delete stats[chan_num];
                    }
                }

            }
        });

    }
}

function build_unit_affiliation() {
    map = function () {
        var now = new Date();
        var difference = now.getTime() - this.date.getTime();
        var minute = Math.floor(difference / 1000 / 60 / 5);
        emit({
            tg: this.tg
        }, {
            count: this.count,
            minute: minute

        });
    }

    reduce = function (key, values) {
        var result = {
            unit_count: []
        };
        values.forEach(function (v) {
            result.unit_count[v.minute] = v.count;
        });
        return result;
    }


    db.collection('affiliation', function (err, afilCollection) {
        var now = new Date();
        afilCollection.mapReduce(map, reduce, {
            query: {
                date: { // 18 minutes ago (from now)
                    $gt: new Date(now.getTime() - 1000 * 60 * 60)
                }
            },
            out: {
                replace: "recent_affiliation"
            }
        }, function (err, collection) {
            if (err) console.error(err);
            if (collection) {
                build_affiliation_array(collection);
            }
        });
    });

}

function build_call_volume() {

    map = function () {
        var now = new Date();
        var difference = now.getTime() - this.time.getTime();
        var hour = Math.floor(difference / 1000 / 60 / 60);
        emit({
            hour: hour,
            talkgroup: this.talkgroup
        }, {
            count: 1
        });
    }

    reduce = function (key, values) {
        var count = 0;

        values.forEach(function (v) {
            count += v['count'];
        });

        return {
            count: count
        };
    }
    db.collection('transmissions', function (err, transCollection) {
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        transCollection.mapReduce(map, reduce, {
            query: {
                time: {
                    $gte: yesterday
                }
            },
            out: {
                replace: "call_volume"
            }
        }, function (err, collection) {
            if (err) console.error(err);
            if (collection) {
                build_stat(collection);
            }
        });
    });
}

function build_source_list() {
    map = function () {
        if (this.srcList) {
            for (var idx = 0; idx < this.srcList.length; idx++) {
                var key = this.srcList[idx];
                var value = {};
                value[this.talkgroup] = 1;

                emit(key, value);
            }
        }
    }
    finalize = function (key, values) {
        var count = 0;
        for (var k in values) {
            count += values[k];
        }

        values['total'] = count;
        return values;
    }

    reduce = function (key, values) {
        var talkgroups = {};



        values.forEach(function (v) {
            for (var k in v) { // iterate colors
                if (!talkgroups[k]) // init missing counter
                {
                    talkgroups[k] = 0;
                }
                talkgroups[k] += v[k];

            }

        });



        return talkgroups;
    }


    db.collection('transmissions', function (err, transCollection) {
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        transCollection.mapReduce(map, reduce, {
            query: {
                time: {
                    $gte: yesterday
                }
            },
            out: {
                replace: "source_list"
            },
            finalize: finalize
        }, function (err, collection) {
            if (err) console.error(err);
            if (collection) {
                //build_stat(collection);
            }
        });
    });
}


app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
    //app.use(express.logger('dev'))
app.use(logger("combined"));

//app.use(express.cookieParser());
app.use(cookieParser());
//app.use(express.bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
//app.use(express.methodOverride());
app.use(require('method-override')())
app.use(session({
    secret: 'keyboard dog',
    key: 'sid',
	resave: true,
	saveUninitialized: true,
    cookie: {
        secure: true,
        maxAge: 3600000
    }
}));
app.get('/media/*', function(req, res){
	console.log("Media trigger");
	console.log(req.url);
	res.sendFile(path.join(__dirname + req.url));
});
/* app.use(express.session({ secret: 'keyboard cat',
           cookie : {
             maxAge: 3600000 // see below
           }
         }));*/
//app.use(express.cookieSession({ secret: 'keyboard cat' }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/public'));


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Twitter profile is serialized
//   and deserialized.
passport.serializeUser(function (user, done) {
    console.log("Serializer user: " + user.id);
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    db.collection('users', function (err, usersCollection) {
        usersCollection.findOne({
                '_id': id
            },
            function (err, item) {
                console.log("Deserialize user: " + item.id);
                if (item) {
                    console.log("User deserialized: " + item.id);
                    done(null, item);

                } else {
                    console.log("User not deserialized");
                    done(null, null);

                }
            });
    });


});

// Use the TwitterStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a token, tokenSecret, and Twitter profile), and
//   invoke a callback with a user object.
twitterAuthn = new TwitterStrategy({
        consumerKey: config.twitterConsumerKey,
        consumerSecret: config.twitterConsumerSecret,
        callbackURL: "http://openmhz.com/auth/twitter/callback"
    },
    function (token, tokenSecret, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {
            profile.token = token;
            profile.tokenSecret = tokenSecret;
            //console.log(profile);
            // To keep the example simple, the user's Twitter profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the Twitter account with a user record in your database,
            // and return that user instead.
            return done(null, profile);
        });
    }
);

passport.use(twitterAuthn);

app.get('/account', ensureAuthenticated, function (req, res) {
    //console.log(req);
    res.render('account', {
        user: req.user
    });
});

app.post('/tweet', ensureAuthenticated, function (req, res) {
    var user = req.user;
    var tweet = req.body.tweet;
    twitterAuthn._oauth.post("https://api.twitter.com/1.1/statuses/update.json", user.token, user.tokenSecret, {
            "status": tweet
        }, "application/json",
        function (error, data, twit_res) {
            if (error) {
                console.error(error);
                res.send(error);
            } else {
                res.send(tweet);
                console.log("Sent: " + tweet);
            }
        }
    );

});

app.get('/login', function (req, res) {
    //console.log(req);
    res.render('login', {
        user: req.user
    });
});

// GET /auth/twitter
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Twitter authentication will involve redirecting
//   the user to twitter.com.  After authorization, the Twitter will redirect
//   the user back to this application at /auth/twitter/callback
app.get('/auth/twitter',
    passport.authenticate('twitter'),
    function (req, res) {
        // The request will be redirected to Twitter for authentication, so this
        // function will not be called.
    });

// GET /auth/twitter/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/twitter/callback',
    passport.authenticate('twitter', {
        failureRedirect: '/login'
    }),
    function (req, res) {

        db.collection('users', function (err, transCollection) {
            var user = req.user;
            //console.log(user);
            transCollection.update({
                _id: user.id
            }, {
                $set: user
            }, {
                upsert: true
            }, function (err, objects) {
                if (err) console.warn(err.message);

            });
        });
        res.redirect('/success');
    });

app.get('/success', function (req, res) {

    var user = req.user;
    res.render('success', {
        user: user
    });
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
    //console.log(req);
    if (req.isAuthenticated()) {
        console.log("Success!");
        return next();
    }
    res.redirect('/login')
}



app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});


app.get('/about', function (req, res) {
    res.render('about', {});
});

app.get('/channels', function (req, res) {


    res.contentType('json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify({
        channels: channels,
        source_names: source_names
    }));


});

app.get('/card/:id', function (req, res) {
    var objectId = req.params.id;
    var o_id = new BSON.ObjectID(objectId);
    db.collection('transmissions', function (err, transCollection) {
        transCollection.findOne({
                '_id': o_id
            },
            function (err, item) {
                //console.log(util.inspect(item));
                if (item) {
                    var time = new Date(item.time);
                    var timeString = time.toLocaleTimeString("en-US");
                    var dateString = time.toDateString();
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.render('card', {
                        item: item,
                        channel: channels[item.talkgroup],
                        time: timeString,
                        date: dateString
                    });

                } else {
                    res.send(404, 'Sorry, we cannot find that!');
                }
            });
    });
});


app.get('/star/:id', function (req, res) {
    var objectId = req.params.id;
    var o_id = new BSON.ObjectID(objectId);
    db.collection('transmissions', function (err, transCollection) {
        transCollection.findAndModify({
                '_id': o_id
            }, [], {
                $inc: {
                    stars: 1
                }
            }, {
                new: true
            },
            function (err, object) {

                if (err) {
                    console.warn(err.message); // returns error if no matching object found
                } else {
                    res.contentType('json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.send(JSON.stringify({
                        stars: object.stars
                    }));
                }

            });
    });
});



app.get('/call/:id', function (req, res) {
    var objectId = req.params.id;
    var o_id = new BSON.ObjectID(objectId);
    db.collection('transmissions', function (err, transCollection) {
        transCollection.findOne({
                '_id': o_id
            },
            function (err, item) {
                //console.log(util.inspect(item));
                if (item) {
                    var time = new Date(item.time);
                    var timeString = time.toLocaleTimeString("en-US");
                    var dateString = time.toDateString();

                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.render('call', {
                        item: item,
                        channel: channels[item.talkgroup],
                        talkgroup: item.talkgroup,
                        time: timeString,
                        date: dateString,
                        objectId: objectId,
                        freq: item.freq,
                        srcList: item.srcList
                    });

                } else {
                    res.send(404, 'Sorry, we cannot find that!');
                }
            });
    });
});

function get_calls(query, res) {

    var calls = [];
    console.log(util.inspect(query.filter));
    db.collection('transmissions', function (err, transCollection) {
        transCollection.find(query.filter).count(function (e, count) {
            transCollection.find(query.filter, function (err, cursor) {
                cursor.sort(query.sort_order).limit(numResults).each(function (err, item) {
                    if (item) {
                        call = {
                            objectId: item._id,
                            talkgroup: item.talkgroup,
                            filename: item.path + item.name,
                            time: item.time,
                            freq: item.freq,
							nac: item.nac,
							tg_long: item.tg_long,
                            srcList: item.srcList,
                            stars: item.stars,
                            len: Math.round(item.len)
                        };
                        calls.push(call);
                    } else {
                        res.contentType('json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.send(JSON.stringify({
                            calls: calls,
                            count: count,
                            direction: query.direction
                        }));
                    }
                });
            });
        });
    });


}

function beta_build_filter(filter_type, code, start_time, direction) {
    var filter = {};
    var FilterType = {
        All: 0,
        Talkgroup: 1,
        Group: 2,
        Unit: 3
    };
    if (filter_type) {
        if (filter_type == "talkgroup") {
            var codeArray = code.split(',').map(function (item) {
                return parseInt(item, 10);
            });
            filter = {
                talkgroup: {
                    $in: codeArray
                }
            };
        }

        if (filter_type == "unit") {
            filter = {
                srcList: code
            };
        }
        if (filter_type == "group") {
            filter = {
                talkgroup: {
                    $in: talkgroup_filters[code]
                }
            };
        }
    }

    if (start_time) {
        var start = new Date(start_time);
        if (direction == 'newer') {
            filter.time = {
                $gt: start
            };
        } else {
            filter.time = {
                $lt: start
            };
        }

    }
    filter.len = {
        $gte: -1.0
    };


    var sort_order = {};
    if (direction == 'newer') {
        sort_order['time'] = 1;
    } else {
        sort_order['time'] = -1;
    }

    var query = {};
    query['filter'] = filter;
    query['direction'] = direction;
    query['sort_order'] = sort_order;

    return query;
}


function build_filter(code, start_time, direction, stars) {
    var filter = {};

    if (code) {
        if (code.substring(0, 3) == 'tg-') {
            tg_num = parseInt(code.substring(3));
            filter = {
                talkgroup: tg_num
            };
        } else if (code.substring(0, 4) == 'src-') {
            src_num = parseInt(code.substring(4));
            filter = {
                srcList: src_num
            };
        } else if (code.substring(0, 6) == 'group-') {
            filter = {
                talkgroup: {
                    $in: talkgroup_filters[code]
                }
            };
        } else {
            switch (code) {
		case 'tag-dispatch':
		case 'tag-cabarrus-fire':
		case 'tag-concord-fire':
		case 'tag-kannapolis-fire':
		case 'tag-cabarrus-ems-fire':
		case 'tag-cabarrus-law':
		case 'tag-cabarrus-analog':
                case 'tag-ops':
                case 'tag-ems':
                case 'tag-fire-dispatch':
                case 'tag-fire':
                case 'tag-hospital':
                case 'tag-interop':
                case 'tag-law-dispatch':
                case 'tag-public-works':
                case 'tag-public-health':
                case 'tag-paratransit':
                case 'tag-st-e':
                case 'tag-water':
                case 'tag-parks':
                case 'tag-parking':
                case 'tag-security':
                case 'tag-transportation':
                case 'tag-water':
				case 'tag-cmpd-central':
				case 'tag-cmpd-eastway':
				case 'tag-cmpd-freedom':
				case 'tag-cmpd-hickory_grove':
				case 'tag-cmpd-independence':
				case 'tag-cmpd-metro':
				case 'tag-cmpd-north':
				case 'tag-cmpd-north_tryon':
				case 'tag-cmpd-providence':
				case 'tag-cmpd-south':
				case 'tag-cmpd-steele_creek':
				case 'tag-cmpd-university_city':
				case 'tag-cmpd-westover':
				case 'tag-cmpd-all':
				case 'tag-cmpd-dispatch':
				case 'tag-cmpd-tactical':
				case 'tag-cmpd-swat':
				case 'tag-cmpd-vcat':
				case 'tag-cmpd-ceu':
				case 'tag-cmpd-bomb_squad':
				case 'tag-meck-sheriff-all':
				case 'tag-meck-sheriff-dispatch':
				case 'tag-meck-sheriff-tactical':
				case 'tag-charlotte-fire-all':
				case 'tag-charlotte-fire-ops':
				case 'tag-charlotte-fire-dispatch':
				case 'tag-charlotte-ems-all':
				case 'tag-charlotte-ems-dispatch':
				case 'tag-charlotte-ems-ops':
				case 'tag-air':
				case 'tag-cats-all':
				case 'tag-cats-rail':
				case 'tag-cats-bus':
				case 'tag-atf':
				case 'tag-dea':
				case 'tag-nc-wildlife':
				case 'tag-viper-medical':
				case 'tag-us-marshals':
				case 'tag-us-immigration-and-customs':
				case 'tag-uncc':
				case 'tag-us-fish-and-wildlife':
				case 'tag-us-forestry':
				case 'tag-statewide-event':
				case 'tag-troop-a':
				case 'tag-troop-b':
				case 'tag-troop-c':
				case 'tag-troop-d':
				case 'tag-troop-e':
				case 'tag-troop-f':
				case 'tag-troop-g':
				case 'tag-troop-h':
				case 'tag-troop-all':
				case 'tag-troop-various':
				case 'tag-nc-parks':
				case 'tag-department-corrections':
				case 'tag-department-defense':
				case 'tag-domestic-preparedness':
				case 'tag-nc-dot':
				case 'tag-nc-national-guard':
				case 'tag-nc-sbi':
				case 'tag-interop':
				case 'tag-nc-hart':
				case 'tag-duke':
				case 'tag-fbi':
				case 'tag-nc-license-theft':
				case 'tag-systemwide':
				case 'tag-rowan':
				case 'tag-regional-ems':
				case 'tag-radio':
				case 'tag-fairgrounds':
				case 'tag-ports-authority':
				case 'tag-nc-fire-marshal':
				case 'tag-nc-va':
				case 'tag-nc-department-agriculture':
				case 'tag-meck-cms':
				case 'tag-meck-cmc':
				case 'tag-meck-water':
				case 'tag-meck-trash':
				case 'tag-meck-services':
				case 'tag-huntersville':
				case 'tag-federal-common':
				case 'tag-matthews':
				case 'tag-davidson':
				case 'tag-mint-hill':
				case 'tag-monroe':
				case 'tag-abc':
				case 'tag-alert':
				case 'tag-meck-event-digital':
				case 'tag-meck-event-analog':
				case 'tag-cabarrus-event':
				case 'tag-meck-fire':
				case 'tag-meck-ems':
				case 'tag-meck-law':
				case 'tag-meck-fire-dispatch':
				case 'tag-meck-ems-dispatch':
				case 'tag-meck-law-dispatch':
				case 'tag-mecklenburg-boa-stadium-all':
				case 'tag-buffer':
				
                    filter = {
                        talkgroup: {
                            $in: talkgroup_filters[code]
                        }
                    };
                    break;
            }
        }
    }

    if (start_time) {
        var start = new Date(start_time);
        if (direction == 'newer') {
            filter.time = {
                $gt: start
            };
        } else {
            filter.time = {
                $lt: start
            };
        }

    }
    filter.len = {
        $gte: -1.0
    };

    if (stars) {
        filter.stars = {
            $gt: 0
        };
    }
    var sort_order = {};
    if (direction == 'newer') {
        sort_order['time'] = 1;
    } else {
        sort_order['time'] = -1;
    }

    var query = {};
    query['filter'] = filter;
    query['direction'] = direction;
    query['sort_order'] = sort_order;

    return query;
}

app.get('/beta/newer/:time', function (req, res) {
    var filter_code = req.query["filter-code"];
    var filter_type = req.query["filter-type"];
    var start_time = parseInt(req.params.time);
    console.log("time: " + start_time + " Filter code: " + filter_code + " Filter Type: " + filter_type);

    var query = beta_build_filter(filter_type, filter_code, start_time, 'newer');
    console.log(util.inspect(query));

    get_calls(query, res);
});

app.get('/beta/older/:time', function (req, res) {
    var filter_code = req.query["filter-code"];
    var filter_type = req.query["filter-type"];
    var start_time = parseInt(req.params.time);
    console.log("time: " + start_time + " Filter code: " + filter_code + " Filter Type: " + filter_type);

    var query = beta_build_filter(filter_type, filter_code, start_time, 'older');
    console.log(util.inspect(query));

    get_calls(query, res);
});

app.get('/beta', function (req, res) {
    var filter_code = req.query["filter-code"];
    var filter_type = req.query["filter-type"];
    console.log(" Filter code: " + filter_code + " Filter Type: " + filter_type);

    var query = beta_build_filter(filter_type, filter_code, null, 'older');
    console.log(util.inspect(query));

    get_calls(query, res);
});


app.get('/calls/newer/:time', function (req, res) {
    var start_time = parseInt(req.params.time);
    var query = build_filter(null, start_time, 'newer', false);

    get_calls(query, res);
});

app.get('/calls/newer/:time/:filter_code', function (req, res) {
    var filter_code = req.params.filter_code;
    var start_time = parseInt(req.params.time);
    var query = build_filter(filter_code, start_time, 'newer', false);

    get_calls(query, res);
});

app.get('/calls/older/:time', function (req, res) {

    var start_time = parseInt(req.params.time);
    console.log("time: " + start_time);
    console.log(util.inspect(req.params));
    var query = build_filter(null, start_time, 'older', false);

    get_calls(query, res);
});
app.get('/calls/older/:time/:filter_code', function (req, res) {
    var filter_code = req.params.filter_code;
    var start_time = parseInt(req.params.time);
    console.log("time: " + start_time + " Filter code: " + filter_code);
    console.log(util.inspect(req.params));
    var query = build_filter(filter_code, start_time, 'older', false);

    get_calls(query, res);
});

app.get('/calls', function (req, res) {
    var filter_code = req.params.filter_code;
    var query = build_filter(null, null, 'older', false);

    get_calls(query, res);
});

app.get('/calls/:filter_code', function (req, res) {
    var filter_code = req.params.filter_code;
    var query = build_filter(filter_code, null, 'older', false);

    get_calls(query, res);
});

app.get('/stars/newer/:time/:filter_code?*', function (req, res) {
    var filter_code = req.params.filter_code;
    var start_time = parseInt(req.params.time);
    var query = build_filter(filter_code, start_time, 'newer', true);

    get_calls(query, res);
});

app.get('/stars/older/:time/:filter_code?*', function (req, res) {
    var filter_code = req.params.filter_code;
    var start_time = parseInt(req.params.time);
    var query = build_filter(filter_code, start_time, 'older', true);

    get_calls(query, res);
});

app.get('/stars/:filter_code?*', function (req, res) {
    var filter_code = req.params.filter_code;
    var query = build_filter(filter_code, null, 'older', true);

    get_calls(query, res);
});



app.get('/scanner/newer/:time', function (req, res) {

    var filter_date = parseInt(req.params.time);
    var user = req.user;




    if (!filter_date) {
        var filter_date = "''";
    } else {
        var filter_date = "new Date(" + filter_date + ")";
    }

    res.render('player', {
        filter_date: filter_date,
        filter_code: "",
        user: user
    });
});


app.get('/scanner/newer/:time/:filter_code', function (req, res) {
    var filter_code = req.params.filter_code;
    var filter_date = parseInt(req.params.time);
    var user = req.user;


    if (!filter_code) filter_code = "";

    if (!filter_date) {
        var filter_date = "''";
    } else {
        var filter_date = "new Date(" + filter_date + ")";
    }

    res.render('player', {
        filter_date: filter_date,
        filter_code: filter_code,
        user: user
    });
});


app.get('/scanner', function (req, res) {

    var filter_date = parseInt(req.params.time);
    var user = req.user;




    var filter_date = "''";


    res.render('player', {
        filter_date: filter_date,
        filter_code: "",
        user: user
    });
});

app.get('/scanner/:filter_code', function (req, res) {
    var filter_code = req.params.filter_code;
    var filter_date = parseInt(req.params.time);
    var user = req.user;

    if (!filter_code) filter_code = "";


    var filter_date = "''";


    res.render('player', {
        filter_date: filter_date,
        filter_code: filter_code,
        user: user
    });
});

/*
app.get('/beta', function(req, res) {
  var filter_code = "";
  var filter_date = "''";
  var user = req.user;
  res.render('beta', {
    filter_date: filter_date,
    filter_code: filter_code,
    user: user
  });
});*/

app.post('/source_name', function (req, res) {
    var tg = req.body.tg;
    console.log("TG: " + tg);
    if (!isNaN(tg) && (tg > 0)) {
        var name = req.body.name;
        var shortName = req.body.shortName;
        console.log("TG: " + tg + " Name: " + name + " shortName: " + shortName);
        if (name) {
            name = name.replace(/[^\w\s]/gi, '');
        }
        if (shortName) {
            shortName = shortName.replace(/[^\w]/gi, '');
        }
        console.log("TG: " + tg + " Name: " + name + " shortName: " + shortName);
        if (name && shortName) {
            sourceNameItem = {
                tg: tg,
                name: name,
                shortName: shortName
            };

            db.collection('source_names', function (err, sourceNameCollection) {
                sourceNameCollection.insert(sourceNameItem, function (err, objects) {
                    if (err) console.warn(err.message);

                    source_names[tg] = {
                        name: name,
                        shortName: shortName
                    };

                    res.contentType('json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.send(JSON.stringify({
                        source_names: source_names
                    }));
                });
            });
        }
    }
});

app.get('/', function (req, res) {
	console.log("/trigger");
    var filter_code = "";
    var filter_date = "''";
    var user = req.user;
    res.render('player', {
        filter_date: filter_date,
        filter_code: filter_code,
        user: user
    });
});

app.post('/', function (req, res) {
    var filter_code = req.body.filter_code;
    if (!filter_code) filter_code = "";
    var filter_date = "new Date('" + req.body.filter_date + "');";
    if (!filter_date) filter_date = "\'\'";
    var user = req.user;
    res.render('player', {
        filter_date: filter_date,
        filter_code: filter_code,
        user: user
    });
});

app.get('/sources', function (req, res) {
    res.render('sources');
});

app.get('/afil', function (req, res) {
    res.render('afil', {});
});

app.get('/stats', function (req, res) {
    res.render('stats', {});
});
app.get('/volume', function (req, res) {
    res.contentType('json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify(stats));
});
app.get('/affiliation', function (req, res) {
    res.contentType('json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify(affiliations));
});
app.get('/source_list', function (req, res) {
    res.contentType('json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify(sources));
});


app.get('/call_info/:id', function (req, res) {
    var objectId = req.params.id;
    var o_id = new BSON.ObjectID(objectId);
    res.contentType('json');
    db.collection('transmissions', function (err, transCollection) {
        transCollection.findOne({
                '_id': o_id
            },
            function (err, item) {
                //console.log(util.inspect(item));
                if (item) {
                    var time = new Date(item.time);
                    var timeString = time.toLocaleTimeString("en-US");
                    var dateString = time.toDateString();

                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.send({
                        item: item,
                        channel: channels[item.talkgroup],
                        talkgroup: item.talkgroup,
                        time: timeString,
                        date: dateString,
                        objectId: objectId,
                        freq: item.freq,
                        srcList: item.srcList
                    });

                } else {
                    res.send(404, 'Sorry, we cannot find that!');
                }
            });
    });
});


app.get('/clients', function (req, res) {
    res.render('clients', {
        clients: clients
    });
});

function notify_clients(call) {
    call.type = "calls";
    console.log("New Call sending to " + clients.length + " clients " + call.talkgroup + " " + call.nac);
    for (var i = 0; i < clients.length; i++) {
        //console.log(util.inspect(clients[i].socket));
        if (clients[i].code == "") {
            //console.log("Call TG # is set to All");
            console.log(" - Sending one");
            clients[i].socket.send(JSON.stringify(call));
        } else {
            if (typeof talkgroup_filters[clients[i].code] !== "undefined") {
                //console.log("Talkgroup filter found: " + clients[i].code);

                if (talkgroup_filters[clients[i].code].indexOf(call.talkgroup) > -1) {
                    //console.log("Call TG # Found in filer");
					console.log("Sending filter " + clients[i].code + ": Call TG: " + call.talkgroup + " Filter TG: " + talkgroup_filters[clients[i].code][talkgroup_filters[clients[i].code].indexOf(call.talkgroup)]);
                    console.log(" - Sending one filter");
                    clients[i].socket.send(JSON.stringify(call));
                }
            }
        }
    }
}

app.post('/upload', upload.single('call'), function(req, res, next) {
    //console.log(req.file);
    //console.log(req.body);

    /** When using the "single"
        data come in "req.file" regardless of the attribute "name". **/
    var tmp_path = req.file.path;
	console.log(tmp_path);

    /** The original name of the uploaded file
        stored in the variable "originalname". **/
    var target_path = 'uploads/' + req.file.originalname;

    if (req.file && (path.extname(req.file.originalname)) == '.m4a') {

        var talkgroup = parseInt(req.body.talkgroup);
        var freq = parseFloat(req.body.freq);
        var time = new Date(parseInt(req.body.start_time) * 1000);
        var emergency = parseInt(req.body.emergency);
		var nac = parseInt(req.body.nac);
		//var nac = parseInt(req.body.nac);
        try {

        var srcList = JSON.parse(req.body.source_list);


      } catch (err){
        var srcList = [];
        console.log(err);

      }

            var base_path = config.mediaDirectory;
            var local_path = "/" + time.getFullYear() + "/" + time.getMonth() + "/" + time.getDate() + "/";
            mkdirp.sync(base_path + local_path, function(err) {
                if (err) console.error(err);
            });
            var target_file = base_path + local_path + path.basename(req.file.originalname);


            var src = fs.createReadStream(req.file.path);
            var dest = fs.createWriteStream(target_file);
            src.pipe(dest);
            src.on('error', function(err) {
              console.log(err);
              res.render('error');
            });
            src.on('end', function() {
              probe(target_file, function(err, probeData) {

                  transItem = {
                      talkgroup: talkgroup,
                      time: time,
                      name: path.basename(req.file.originalname),
                      freq: freq,
					  stars: 0,
					  nac: nac,
                      emergency: emergency,
                      path: local_path,
                      srcList: srcList
                  };

                  //transItem.len = reader.chunkSize / reader.byteRate;

                  if (err) {
                      //console.log("Error with FFProbe: " + err);
                      transItem.len = -1;
                  } else {
                      transItem.len = probeData.format.duration;
                  }
                  //console.log(util.inspect(transItem));
                  db.collection('transmissions', function(err, transCollection) {
                      transCollection.insert(transItem, function(err, objects) {
                          if (err) console.warn(err.message);
                          var objectId = transItem._id;

                          //console.log("Added: " + f);
                          var call = {
                              objectId: objectId,
                              talkgroup: transItem.talkgroup,
                              filename: transItem.path + transItem.name,
                              stars: transItem.stars,
                              freq: transItem.freq,
							  nac: transItem.nac,
                              time: transItem.time,
							  srcList: transItem.srcList,
                              len: Math.round(transItem.len)
                          };

                          // we only want to notify clients if the clip is longer than 1 second.
                          if (transItem.len >= 1) {
                              notify_clients(call);
                          }
                      });
                  });
              });

              res.status(200);
              res.send("Success\n");
            });

			if(fs.existsSync(tmp_path)){
				fs.unlink(tmp_path);
			}
        }
});

/*watch.createMonitor(config.uploadDirectory, function (monitor) {
    monitor.files['*.m4a'];
    //monitor.files['*.wav'];


    monitor.on("created", function (f, stat) {

        if ((path.extname(f) == '.json') && (monitor.files[f] === undefined)) {
            var name = path.basename(f, '.json');
            var regex = /([0-9]*)-unit_check/
            var result = name.match(regex);
			//console.log(f.nac);
			//console.log(path.basename(f));
			//var jtest = require(f);
			//console.log(jtest.nac);
            if (result != null) {
                console.log("Unit Check: " + f);
                fs.readFile(f, 'utf8', function (err, data) {
                    console.log("Error: " + err);

                    if (!err) {
                        try {
                            data = JSON.parse(data);
                        } catch (e) {
                            // An error has occured, handle it, by e.g. logging it
                            data.talkgroups = {};
                            console.log(e);
                        }
                        console.log("Data: " + util.inspect(data));
                        db.collection('affiliation', function (err, affilCollection) {

                            for (talkgroup in data.talkgroups) {
                                var affilItem = {
                                    tg: talkgroup,
                                    count: data.talkgroups[talkgroup],
                                    date: new Date()
                                };

                                affilCollection.insert(affilItem, function (err, objects) {
                                    if (err) console.warn(err.message);

                                });
                            }
                        });

                    }
                });
            }
        }
        if ((path.extname(f) == '.m4a') && (monitor.files[f] === undefined)) {
			console.log(path.basename(f));
            var name = path.basename(f, '.m4a');
            //if ((path.extname(f) == '.wav') && (monitor.files[f] === undefined)) {
              //var name = path.basename(f, '.wav');
            var regex = /([0-9]*)-([0-9]*)_([0-9.]*)/
            var result = name.match(regex);
            //console.log(name);
            //console.log(util.inspect(result));
            if (result != null) {
                var tg = parseInt(result[1]);
                var time = new Date(parseInt(result[2]) * 1000);
                var freq = parseFloat(result[3]);
                //var base_path = '/srv/www/openmhz.com/media';
                var base_path = config.mediaDirectory;
                var local_path = "/" + time.getFullYear() + "/" + time.getMonth() + "/" + time.getDate() + "/";
                mkdirp.sync(base_path + local_path, function (err) {
                    if (err) console.error(err);
                });
                var target_file = base_path + local_path + path.basename(f);
                var json_file = path.dirname(f) + "/" + name + ".json";
				var nac = 0;
                fs.readFile(json_file, 'utf8', function (err, data) {
                    if (err) {
                        console.log('JSON Error: ' + err);
                        console.log("Base: " + base_path + " Local: " + local_path + " Basename: " + path.basename(f));
                        console.log("F Path: " + path.dirname(f));
                        var srcList = [];
                    } else {
                        try {
                            data = JSON.parse(data);
							nac = data.nac;
                        } catch (e) {
                        }
                        var srcList = data.srcList;
                        fs.unlink(json_file, function (err) {
                            if (err)
                                console.log('JSON Delete Error: ' + err + " JSON: " + json_file);
                        });
                    }


                    var source_file = fs.createReadStream(f);
                    var destination_file = fs.createWriteStream(target_file);
					var tg_long = tg.toString(10) + "_" + nac.toString(16);
					//console.log(tg_long);
                    source_file.pipe(destination_file);
                    source_file.on('end', function () {

                        setTimeout(function () {
                            probe(target_file, function (err, probeData) {

                                transItem = {
                                    talkgroup: tg,
                                    time: time,
                                    name: path.basename(f),
                                    freq: freq,
									nac: nac,
									tg_long: tg_long,
                                    stars: 0,
                                    path: local_path,
                                    srcList: srcList
                                };
                                //transItem.len = reader.chunkSize / reader.byteRate;

                                if (err) {
                                    console.log("Error with FFProbe: " + err);
                                    transItem.len = -1;
                                } else {
                                    transItem.len = probeData.format.duration;
									db.collection('transmissions', function (err, transCollection) {
                                    transCollection.insert(transItem, function (err, objects) {
                                        if (err) console.warn(err.message);
                                        var objectId = transItem._id;

                                        //console.log("Added: " + f);
                                        var call = {
                                            objectId: objectId,
                                            talkgroup: transItem.talkgroup,
                                            filename: transItem.path + transItem.name,
                                            stars: transItem.stars,
                                            freq: transItem.freq,
											nac: nac,
											tg_long: tg_long,
                                            time: transItem.time,
                                            srcList: transItem.srcList,
                                            len: Math.round(transItem.len)
                                        };

                                        // we only want to notify clients if the clip is longer than 1 second.
                                        if (transItem.len >= 1) {
                                            notify_clients(call);
                                        }
                                    });
                                });
                                }
                                
                            });
                        }, 10000);

                        fs.unlink(f, function (err) {
                            if (err) {
                                console.log("Rename Error: " + err);
                                console.log("Base: " + base_path + " Local: " + local_path + " Basename: " + path.basename(f));
                                console.log("F Path: " + path.dirname(f));
                            }

                        });
						console.log("Unlinked " + path.basename(f));
                    });

                });

            }
        }
    });
});
*/
wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

wsServer.on('request', function (request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log(('Rejected: ' + new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    } else {
        console.log(('Accepted: ' + new Date()) + ' Connection from origin ' + request.origin + ' accepted.');
    }

    var connection = request.accept(null, request.origin);
    var client = {
        socket: connection,
        code: null
    };
    clients.push(client);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            try {
                var data = JSON.parse(message.utf8Data);
                if (typeof data.type !== "undefined") {
                    if (data.type == 'code') {
                        var index = clients.indexOf(client);
                        if (index != -1) {
                            clients[index].code = data.code;
                            console.log("Client " + index + " code set to: " + data.code);
                        } else {
                            console.log("Client not Found!");
                        }
                    }
                }
            } catch (e) {
                // An error has occured, handle it, by e.g. logging it

                console.log("This is E" + e);
            }
            console.log('Received message.utf8Data: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        } else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        for (var i = 0; i < clients.length; i++) {
            // # Remove from our connections list so we don't send
            // # to a dead socket
            if (clients[i].socket == connection) {
                clients.splice(i);
                break;
            }
        }
    });
});



schedule.scheduleJob({
    minute: 0
}, function () {
    build_unit_affiliation();
});


schedule.scheduleJob({
    minute: new schedule.Range(0, 59, 5)
}, function () {
    build_call_volume();
});

schedule.scheduleJob({
    minute: 30,
    hour: 1
}, function () {
    build_source_list();
});


server.listen(3004);
