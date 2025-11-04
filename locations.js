var request = require('request');

const apiOptions = {
  server: 'http://localhost:3000'
};

if (process.env.NODE_ENV === 'production') {
  apiOptions.server = 'https://loc8r-api-4-sob8.onrender.com';
}

const homelist = (req, res) => {
  const path = '/api/locations';
  const requestOptions = {
    url: `${apiOptions.server}${path}`,
    method: 'GET',
    json: true,
    qs: {
      lng: 127.264227,
      lat: 37.011746,
      maxDistance: 20000
    }
  };

  request(requestOptions, (err, response, body) => {
    let data = [];
    if (!err && response && response.statusCode === 200 && Array.isArray(body)) {
      data = body.map(item => {
        item.distance = formatDistance(item.distance);
        return item;
      });
    } else {
      console.error('API call failed', err || body);
    }
    renderHomepage(req, res, data);
  });
};

const formatDistance = distance => {
  let thisDistance = 0,
      unit = 'm';
  if (distance > 1000) {
    thisDistance = parseFloat(distance / 1000).toFixed(1);
    unit = 'km';
  } else {
    thisDistance = Math.floor(distance);
  }
  return thisDistance + unit;
};

const renderHomepage = (req, res, responseBody) => {
  let message = null;
  if (!Array.isArray(responseBody)) {
    message = 'API lookup error';
    responseBody = [];
  } else if (responseBody.length === 0) {
    message = 'No places found nearby';
  }

  res.render('locations-list', {
    title: 'Loc8r - find a place to work with wifi',
    pageHeader: {
      title: 'Loc8r',
      strapline: 'Find places to work with wifi near you!'
    },
    sidebar: "Looking for wifi and a seat? Loc8r helps you find places to work when out and about. Perhaps with coffee, cake or a pint? Let Loc8r help you find the place you're looking for.",
    locations: responseBody,
    message
  });
};

const getLocationInfo = (req, res, callback) => {
  const path = `/api/locations/${req.params.locationid}`;
  const requestOptions = {
    url: `${apiOptions.server}${path}`,
    method: 'GET',
    json: true
  };

  request(requestOptions, (err, response, body) => {
    if (!err && response && response.statusCode === 200 && body) {
      if (Array.isArray(body.coords) && body.coords.length === 2) {
        body.coords = { lng: body.coords[0], lat: body.coords[1] };
      } else {
        body.coords = { lng: 0, lat: 0 };
      }
      callback(req, res, body);
    } else {
      showError(req, res, response ? response.statusCode : 500);
    }
  });
};

const locationInfo = (req, res) =>
  getLocationInfo(req, res, (req, res, data) => renderDetailPage(req, res, data));

const renderDetailPage = (req, res, location) => {
  res.render('location-info', {
    title: location.name || 'Location',
    pageHeader: { title: location.name || 'Location' },
    sidebar: {
      context: 'is on Loc8r because it has accessible wifi and space to sit down with your laptop and get some work done.',
      callToAction: "If you've been and you like it - or if you don't - please leave a review to help other people just like you."
    },
    location
  });
};

const addReview = (req, res) =>
  getLocationInfo(req, res, (req, res, data) => renderReviewForm(req, res, data));

const renderReviewForm = (req, res, { name }) => {
  res.render('location-review-form', {
    title: `Review ${name || 'this location'} on Loc8r`,
    pageHeader: { title: `Review ${name || 'this location'}` },
    error: req.query.err
  });
};

const doAddReview = (req, res) => {
  const locationid = req.params.locationid;
  const path = `/api/locations/${locationid}/reviews`;
  const postdata = {
    author: req.body.name,
    rating: parseInt(req.body.rating, 10),
    reviewText: req.body.review
  };

  if (!postdata.author || !postdata.rating || !postdata.reviewText) {
    res.redirect(`/location/${locationid}/review/new?err=val`);
    return;
  }

  const requestOptions = {
    url: `${apiOptions.server}${path}`,
    method: 'POST',
    json: postdata
  };

  request(requestOptions, (err, response, body) => {
    if (response && response.statusCode === 201) {
      res.redirect(`/location/${locationid}`);
    } else if (response && response.statusCode === 400 && body && body.name === 'ValidationError') {
      res.redirect(`/location/${locationid}/review/new?err=val`);
    } else {
      showError(req, res, response ? response.statusCode : 500);
    }
  });
};

const showError = (req, res, status) => {
  let title = '',
      content = '';
  if (status === 404) {
    title = '404, page not found';
    content = 'Oh dear. Looks like you can\'t find this page. Sorry.';
  } else {
    title = `${status}, something's gone wrong`;
    content = 'Something, somewhere, has gone just a little bit wrong.';
  }
  res.status(status).render('generic-text', { title, content });
};

module.exports = {
  homelist,
  locationInfo,
  addReview,
  doAddReview
};
