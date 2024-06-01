const API_DIFY_KEY = PropertiesService.getScriptProperties().getProperty('API_DIFY_KEY');
const DIFY_BASE_URL = PropertiesService.getScriptProperties().getProperty('DIFY_BASE_URL');
const DISCODE_WEBHOOK_FOR_YOUTUBE_TODAY = PropertiesService.getScriptProperties().getProperty('DISCODE_WEBHOOK_FOR_YOUTUBE_TODAY');
const SPREAD_SHEET = PropertiesService.getScriptProperties().getProperty('SPREAD_SHEET');
const apiKey = PropertiesService.getScriptProperties().getProperty('apiKey');


/**
 * 指定したチャンネルIDの最新の動画を取得する関数
 * @param {string} channelId - 対象のチャンネルID
 * @return {Object|null} - 最新の動画情報オブジェクト、または動画が見つからない場合はnull
 */
function getLatestVideoByChannelId(channelId) {
  var url = "https://www.googleapis.com/youtube/v3/search?key=" + apiKey + "&channelId=" + channelId + "&part=snippet,id&order=date&maxResults=1";
  var response = UrlFetchApp.fetch(url);
  var data = JSON.parse(response.getContentText());
  
  if (data.items && data.items.length > 0) {
    var latestVideo = data.items[0];
    return {
      "videoId": latestVideo.id.videoId,
      "title": latestVideo.snippet.title,
      "description": latestVideo.snippet.description,
      "publishedAt": latestVideo.snippet.publishedAt,
      "url": "https://www.youtube.com/watch?v=" + latestVideo.id.videoId
    };
  } else {
    return null;
  }
}

/**
 * 指定したクエリで動画を検索する関数
 * @param {string} query - 検索クエリ
 * @param {number} [maxResults=10] - 取得する最大結果数
 * @return {Array} - 検索結果の動画情報オブジェクトの配列
 */

function searchVideos(query, maxResults = 10) {
  var url = "https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=" + encodeURIComponent(query) + "&maxResults=" + maxResults + "&key=" + apiKey;

  try {
    var response = UrlFetchApp.fetch(url);
    var json = JSON.parse(response.getContentText());

    if (json.items && json.items.length > 0) {
      return json.items;
    } else {
      console.log('No videos found for the search query.');
      return [];
    }
  } catch (err) {
    console.log('Failed with an error: ' + err.message);
    return [];
  }
}

/**
 * 指定した動画IDの詳細情報を取得する関数
 * @param {string} videoId - 対象の動画ID
 * @return {Object|null} - 動画の詳細情報オブジェクト、または情報が取得できない場合はnull
 */
function getVideoDetails(videoId) {
  var url = "https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=" + videoId + "&key=" + apiKey;

  try {
    var response = UrlFetchApp.fetch(url);
    var json = JSON.parse(response.getContentText());

    if (json.items && json.items.length > 0) {
      var video = json.items[0];
      return {
        videoId: videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        publishedAt: video.snippet.publishedAt,
        duration: video.contentDetails.duration,
        viewCount: video.statistics.viewCount,
        likeCount: video.statistics.likeCount,
        dislikeCount: video.statistics.dislikeCount,
        commentCount: video.statistics.commentCount
      };
    }

    return null;
  } catch (err) {
    console.log('Failed to get video details for video ID: ' + videoId);
    console.log('Error: ' + err.message);
    return null;
  }
}

/**
 * 指定した動画名に関連するチャンネルリストを取得する関数
 * @param {string} videoName - 検索する動画名
 * @return {void}
 */
function getChannelListByName(videoName) {
  try {
    var url = "https://www.googleapis.com/youtube/v3/search?part=snippet,id&q=" + encodeURIComponent(videoName) + "&type=channel&maxResults=10&key=" + apiKey;
    var response = UrlFetchApp.fetch(url);
    var json = JSON.parse(response.getContentText());
    var items = json.items;
    var channelData = [];

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var snippet = item.snippet;
      var channelId = item.id.channelId;
      var title = snippet.title;
      var description = snippet.description;

      channelData.push({
        title: title,
        description: description,
        channelId: channelId
      });
    }
    for (var i = 0; i < channelData.length; i++) {
      var channel = channelData[i];
      console.log("Title: " + channel.title);
      console.log("Description: " + channel.description);
      console.log("Channel ID: " + channel.channelId);
      console.log("---");
    }
  } catch (err) {
    console.log('Error: ' + err.message);
    return null;
  }
}

/**
 * 指定したクエリで検索した動画を分析する関数
 * @param {string} query - 検索クエリ
 * @return {void}
 */
function analyzeVideos(query) {
  var results = searchVideos(query);
  
  results.forEach((item) => {
    if (item.id.kind === 'youtube#video') {
      var details = getVideoDetails(item.id.videoId);
      
      if (details) {
        console.log('[%s] Title: %s, viewCount: %s, likeCount: %s, publishedAt: %s', details.videoId, details.title, details.viewCount, details.likeCount, details.publishedAt);
      }
    } else {
      console.log('Skipping channel: %s', item.snippet.title);
    }
  });
}

/**
 * 指定したチャンネルIDと日付範囲内の動画を取得する関数
 * @param {string} channelId - 対象のチャンネルID
 * @param {string} [startDate=""] - 開始日（ISO 8601形式）
 * @param {string} [endDate=""] - 終了日（ISO 8601形式）
 * @return {Array} - 動画情報オブジェクトの配列
 */
function getVideosByChannelAndDateRange(channelId, startDate = "", endDate = "") {
  try {
    var videos = [];
    var nextPageToken = "";
    do {
      var url = "https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=" + channelId + "&maxResults=10&order=date&type=video&key=" + apiKey;

      if (startDate !== "") {
        url += "&publishedAfter=" + new Date(startDate).toISOString();
      }

      if (endDate !== "") {
        url += "&publishedBefore=" + new Date(endDate).toISOString();
      }

      if (nextPageToken !== "") {
        url += "&pageToken=" + nextPageToken;
      }

      var response = UrlFetchApp.fetch(url);
      var json = JSON.parse(response.getContentText());

      videos = videos.concat(json.items.map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt
      })));

      nextPageToken = json.nextPageToken;
    } while (nextPageToken);

    return videos;
  } catch (err) {
    console.log('Failed with an error: ' + err.message);
    return [];
  }
}

/**
 * 指定したチャンネルIDと最大結果数で、再生回数順に動画を取得する関数
 * @param {string} channelId - 対象のチャンネルID
 * @param {number} maxResults - 取得する最大結果数
 * @return {Array} - 動画情報オブジェクトの配列
 */
function getVideosByChannelAndViewcount(channelId, maxResults) {
  try {
    var videos = [];
    var nextPageToken = "";
    do {
      var url = "https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=" + channelId + "&maxResults=" + maxResults + "&order=viewCount&type=video&key=" + apiKey;


      if (nextPageToken !== "") {
        url += "&pageToken=" + nextPageToken;
      }

      var response = UrlFetchApp.fetch(url);
      var json = JSON.parse(response.getContentText());

      videos = videos.concat(json.items.map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt
      })));

      nextPageToken = json.nextPageToken;
    } while (nextPageToken);

    return videos;
  } catch (err) {
    console.log('Failed with an error: ' + err.message);
    return [];
  }
}
/**
 * 指定したチャンネル名と日付範囲の動画を分析する関数
 * @param {string} channelName - 対象のチャンネル名
 * @param {Date} startDate - 開始日
 * @param {Date} endDate - 終了日
 * @return {Array|null} - 分析された動画情報の配列、またはチャンネルが見つからない場合はnull
 */
function analyzeChannelVideos(channelName, startDate, endDate) {
  var channelId = getChannelIdByName(channelName);
  if (!channelId) {
    console.log('Channel not found for name: ' + channelName);
    return null;
  }

  var videos = getVideosByChannelAndDateRange(channelId, startDate, endDate);

  if (videos.length > 0) {
    console.log('Videos published between ' + startDate.toDateString() + ' and ' + endDate.toDateString() + ':');
    var analyzedVideos = videos.map(function(video) {
      if (!video.videoId) {
        return null;
      }

      var details = getVideoDetails(video.videoId);
      if (details) {
        return {
          title: details.title,
          videoId: details.videoId,
          publishedAt: details.publishedAt,
          duration: details.duration,
          viewCount: details.viewCount,
          likeCount: details.likeCount,
          dislikeCount: details.dislikeCount,
          commentCount: details.commentCount
        };
      } else {
        return null;
      }
    }).filter(function(video) {
      return video !== null;
    });

    return analyzedVideos;
  } else {
    console.log('No videos found for the specified date range.');
    return [];
  }
}
/**
 * 指定したチャンネルIDの今日の動画IDを取得する関数
 * @param {string} channelId - 対象のチャンネルID
 * @return {Array} - 今日の動画IDの配列
 */
function getTodayVideos(channelId) {
  var today = new Date();
  var startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()-1);
  var endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  var videos = getVideosByChannelAndDateRange(channelId, startOfDay, endOfDay);

  var videoIds = videos.map(function(video) {
    return video.videoId;
  });

  return videoIds;
}
/**
 * 指定した動画IDの要約を生成するためにDIFYにPOSTリクエストを送信する関数
 * @param {string} videoId - 対象の動画ID
 * @return {string} - 生成された動画要約
 */
function postYoutubeSummarizer(videoId) {
  var url = DIFY_BASE_URL + '/workflows/run';
  var payload = {
    'inputs': {
      'url': "https://www.youtube.com/watch?v=" + videoId,
      'knowledge':''
    },
    'response_mode': 'blocking',
    'user': 'abc-123'
  };
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'Authorization': 'Bearer ' + API_DIFY_KEY
    },
    'payload': JSON.stringify(payload)
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var data = JSON.parse(response.getContentText());
  Logger.log(data);
  message = data['data']['outputs'];
  return message
}

/**
 * 指定したチャンネルIDの今日の動画要約をDiscordに投稿する関数
 * @param {string} channelId - 対象のチャンネルID
 * @param {string} channelName - 対象のチャンネル名
 * @return {void}
 */
function postTodayVideoSummariesToDiscord(channelId,channelName) {
  // var channelId = 'UCLXo7UDZvByw2ixzpQCufnA';
  var todayVideoIds = getTodayVideos(channelId);
  // var channelName = 'Vox'
  console.log('Video IDs for today\'s videos in channel ' + channelId + ':');
  todayVideoIds.forEach(function(videoId) {
    var videoInfo = getVideoDetails(videoId)
    Logger.log(videoInfo);
    var result = postYoutubeSummarizer(videoId);
    // Logger.log(result);
    var summary = String(result.result);
    var truncatedSummary = summary.substring(0, 1500);
    postToDiscord("# " + videoInfo.title + "\n" + videoInfo.publishedAt + "\n## " + channelName + "\n## " + truncatedSummary + "\nhttps://www.youtube.com/watch?v=" + videoId);
  });
}
/**
 * スプレッドシートからチャンネル情報を取得する関数
 * @return {Array} - チャンネル情報のオブジェクトの配列
 */
function getChannelInfoFromSheet() {
  var sheet = SpreadsheetApp.openById(SPREAD_SHEET).getSheetByName("シート1");
  var data = sheet.getDataRange().getValues();
  var channelInfoArray = [];

  for (var i = 1; i < data.length; i++) {
    var channelName = data[i][0];
    var channelId = data[i][1];
    var channelInfo = {
      "channelName": channelName,
      "channelId": channelId
    };
    channelInfoArray.push(channelInfo);
  }
  Logger.log(channelInfoArray);
  return channelInfoArray;
}
/**
 * スプレッドシートのチャンネルIDを更新する関数
 * @return {void}
 */
function updateChannelIdInSheet() {
  var sheetId = SPREAD_SHEET;
  var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("シート1");
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var channelName = data[i][0];
    var existingChannelId = data[i][1];

    if (existingChannelId) {
      console.log('Channel ID already exists for: ' + channelName);
      continue;
    }

    var channelInfo = getChannelIdByName0(channelName);

    if (channelInfo) {
      sheet.getRange(i + 1, 2).setValue(channelInfo.channelId);
      sheet.getRange(i + 1, 3).setValue(channelInfo.title);
      sheet.getRange(i + 1, 5).setValue(channelInfo.description);
    } else {
      console.log('Channel information not found for: ' + channelName);
    }
  }
}
/**
 * チャンネル名からチャンネルIDを取得する関数
 * @param {string} channelName - 対象のチャンネル名
 * @return {Object|null} - チャンネル情報のオブジェクト、またはチャンネルが見つからない場合はnull
 */
function getChannelIdByName0(channelName) {
  try {
    var url = "https://www.googleapis.com/youtube/v3/search?part=snippet,id&q=" + encodeURIComponent(channelName) + "&type=channel&maxResults=1&key=" + apiKey;
    var response = UrlFetchApp.fetch(url);
    var json = JSON.parse(response.getContentText());
    var items = json.items;

    if (items.length > 0) {
      var channelId = items[0].id.channelId;
      var title = items[0].snippet.title;
      var description = items[0].snippet.description;
      return {
        channelId: channelId,
        title: title,
        description: description
      };
    } else {
      return null;
    }
  } catch (err) {
    console.log('Error: ' + err.message);
    return null;
  }
}

/**
 * Discordにメッセージを投稿する関数
 * @param {string} message - 投稿するメッセージ
 * @return {void}
 */
function postToDiscord(message) {
  var webhookUrl = DISCODE_WEBHOOK_FOR_YOUTUBE_TODAY;

  var options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      payload: JSON.stringify({"content":message}),

    };

  UrlFetchApp.fetch(webhookUrl, options);
}
/**
 * スプレッドシートからチャンネルの今日の動画要約を処理する関数
 * @param {number} start - 処理を開始する行番号
 * @param {number} end - 処理を終了する行番号
 * @return {void}
 */
function processChannelsTodaySummariesFromSheet(start, end) {
  var sheetId = SPREAD_SHEET;
  var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("シート1");
  var data = sheet.getDataRange().getValues();

  for (var i = start; i < Math.min(data.length, end); i++) {
    var channelId = data[i][1];
    var channelName = data[i][2];

    if (channelId && channelName) {
      try {
        postTodayVideoSummariesToDiscord(channelId, channelName);
      } catch (error) {
        postToDiscord('Error processing channel: ' + channelName);
        console.error(error);
      }
    } else {
      console.log('Channel ID or title missing for row: ' + (i + 1));
    }
  }
}
/**
 * スプレッドシートの1行目から10行目までのチャンネルの今日の動画要約を処理する関数
 * @return {void}
 */
function processChannelsTodaySummariesFromSheetPart1(){
  processChannelsTodaySummariesFromSheet(1,11)
}

/**
 * スプレッドシートの12行目から20行目までのチャンネルの今日の動画要約を処理する関数
 * @return {void}
 */
function processChannelsTodaySummariesFromSheetPart2(){
  processChannelsTodaySummariesFromSheet(12,21)
}

/**
 * スプレッドシートの22行目から30行目までのチャンネルの今日の動画要約を処理する関数
 * @return {void}
 */
function processChannelsTodaySummariesFromSheetPart3(){
  processChannelsTodaySummariesFromSheet(22,31)
}

/**
 * 指定したチャンネル名の過去3ヶ月分の動画を処理する関数
 * @return {void}
 */
function processChannelFromSheetForThreeMonths() {
  const channelName = 'MIT OpenCourseWare';
  const months = 3;
  const endMonth = 0;

  var sheetId = SPREAD_SHEET;
  var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("シート1");
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var currentChannelName = data[i][2];

    if (currentChannelName === channelName) {
      var channelId = data[i][1];

      if (channelId) {
        try {
          var today = new Date(today.getFullYear(), today.getMonth() - endMonth, today.getDate());
          var threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - months, today.getDate());

          var videos = getVideosByChannelAndDateRange(channelId, threeMonthsAgo, today);

          console.log('Videos for channel "' + channelName + '" in the last ' + months + ' months:');
          videos.forEach(function(video) {
            try {
              var videoInfo = getVideoDetails(video.videoId);
              Logger.log(videoInfo);
              var result = postYoutubeSummarizer(video.videoId);
              var summary = String(result.result);
              var truncatedSummary = summary.substring(0, 1500);
              postToDiscord("# " + videoInfo.title + "\n" + videoInfo.publishedAt + "\n## " + channelName + "\n## " + truncatedSummary + "\nhttps://www.youtube.com/watch?v=" + video.videoId);
            } catch (error) {
              console.error('Error processing video: ' + video.videoId);
              console.error(error);
            }
          });
        } catch (error) {
          console.error('Error retrieving videos for channel: ' + channelName);
          console.error(error);
        }

        return;
      } else {
        console.log('Channel ID missing for channel: ' + channelName);
      }
    }
  }

  console.log('Channel not found: ' + channelName);
}
/**
 * 指定したチャンネル名の再生回数の多い動画を処理する関数
 * @return {void}
 */
function processChannelFromSheetForViewCount() {
  const channelName = 'Bloomberg Originals';
  const numVideo = 15;
  var sheetId = SPREAD_SHEET;
  var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("シート1");
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var currentChannelName = data[i][2];

    if (currentChannelName === channelName) {
      var channelId = data[i][1];

      if (channelId) {
        try {

          var videos = getVideosByChannelAndViewcount(channelId, numVideo);

          console.log('Videos for channel "' + channelName);
          videos.forEach(function(video) {
            try {
              var videoInfo = getVideoDetails(video.videoId);
              Logger.log(videoInfo);
              var result = postYoutubeSummarizer(video.videoId);
              var summary = String(result.result);
              var truncatedSummary = summary.substring(0, 1500);
              postToDiscord("# " + videoInfo.title + "\n" + videoInfo.publishedAt + "\n## " + channelName + "\n## " + truncatedSummary + "\nhttps://www.youtube.com/watch?v=" + video.videoId);
            } catch (error) {
              console.error('Error processing video: ' + video.videoId);
              console.error(error);
            }
          });
        } catch (error) {
          console.error('Error retrieving videos for channel: ' + channelName);
          console.error(error);
        }

        return;
      } else {
        console.log('Channel ID missing for channel: ' + channelName);
      }
    }
  }

  console.log('Channel not found: ' + channelName);
}


function testGetChannelIdByName(){
  Logger.log(getChannelListByName("business"))
}

function testSearchVideos() {
  var query = 'bloomberg';
  var maxResults = 10;
  var results = searchVideos(query, maxResults);
  console.log('Search results for "' + query + '" (max ' + maxResults + '):');
  results.forEach((item) => {
    console.log('- ' + item.snippet.title);
  });
}

function testGetVideoDetails() {
  var videoId = 'AvZ2BvzNbFo';
  var details = getVideoDetails(videoId);
  console.log('Video details for video ID ' + videoId + ':');
  console.log(details);
}

function testAnalyzeVideos() {
  var query = 'Love Adviser';
  console.log('Analyzing videos for query "' + query + '":');
  analyzeVideos(query);
}

function testGetVideosByChannelAndDateRange() {
  var channelId = 'UCP5tjEmvPItGyLhmjdwP7Ww';
  var startDate = new Date('2024-05-01');
  var endDate = new Date('2024-05-31');
  var videos = getVideosByChannelAndDateRange(channelId, startDate, endDate);
  console.log('Videos for channel ID ' + channelId + ' between ' + startDate.toDateString() + ' and ' + endDate.toDateString() + ':');
  videos.forEach((video) => {
    console.log('- ' + video.title + ', date:' + video.publishedAt);
  });
}

function testAnalyzeChannelVideos() {
  var channelName = 'Vox';
  var startDate = new Date('2024-01-01');
  var endDate = new Date('2024-12-31');
  console.log('Analyzing videos for channel "' + channelName + '" between ' + startDate.toDateString() + ' and ' + endDate.toDateString() + ':');
  results = analyzeChannelVideos(channelName, startDate, endDate);
  Logger.log(results)
}
