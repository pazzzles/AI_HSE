const REVIEWS_TSV_URL = 'reviews_test.tsv';

const analyzeBtn = document.getElementById('analyze-btn');
const tokenInput = document.getElementById('token-input');
const reviewBox = document.getElementById('review');
const sentimentDiv = document.getElementById('sentiment');
const sentimentLabelDiv = document.getElementById('sentiment-label');
const errorDiv = document.getElementById('error');
const loadingDiv = document.getElementById('loading');

let reviews = [];

function showLoading(msg) {
    loadingDiv.textContent = msg;
    loadingDiv.style.display = 'block';
}

function hideLoading() {
    loadingDiv.style.display = 'none';
}

function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
}

function hideError() {
    errorDiv.style.display = 'none';
}

function clearSentiment() {
    sentimentDiv.innerHTML = '';
    sentimentLabelDiv.textContent = '';
}

function clearReview() {
    reviewBox.textContent = '';
}

function setSentiment(type) {
    if (type === 'positive') {
        sentimentDiv.innerHTML = '<i class="fa-solid fa-thumbs-up" style="color:#28a745"></i>';
        sentimentLabelDiv.textContent = 'Positive';
    } else if (type === 'negative') {
        sentimentDiv.innerHTML = '<i class="fa-solid fa-thumbs-down" style="color:#dc3545"></i>';
        sentimentLabelDiv.textContent = 'Negative';
    } else {
        sentimentDiv.innerHTML = '<i class="fa-solid fa-question" style="color:#ffc107"></i>';
        sentimentLabelDiv.textContent = 'Neutral';
    }
}

function enableButton() {
    analyzeBtn.disabled = false;
}

function disableButton() {
    analyzeBtn.disabled = true;
}

function fetchReviews() {
    showLoading('Loading reviews...');
    fetch(REVIEWS_TSV_URL)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch reviews_test.tsv');
            return response.text();
        })
        .then(tsvText => {
            Papa.parse(tsvText, {
                header: true,
                delimiter: '\t',
                skipEmptyLines: true,
                complete: function(results) {
                    if (!results.data || !Array.isArray(results.data)) {
                        throw new Error('TSV parsing failed.');
                    }
                    reviews = results.data
                        .map(row => row['text'])
                        .filter(text => typeof text === 'string' && text.trim().length > 0);
                    if (reviews.length === 0) {
                        throw new Error('No reviews found in TSV.');
                    }
                    hideLoading();
                    enableButton();
                },
                error: function(err) {
                    hideLoading();
                    showError('Error parsing TSV: ' + err.message);
                }
            });
        })
        .catch(err => {
            hideLoading();
            showError('Error loading reviews: ' + err.message);
        });
}

function getRandomReview() {
    if (reviews.length === 0) return null;
    const idx = Math.floor(Math.random() * reviews.length);
    return reviews[idx];
}
function analyzeSentiment(reviewText, token) {
    clearSentiment();
    sentimentLabelDiv.textContent = '';
    sentimentDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:#007bff"></i>';
    const url = 'https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english';
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token && token.trim().length > 0) {
        headers['Authorization'] = 'Bearer ' + token.trim();
    }
    fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ inputs: reviewText })
    })
    .then(async response => {
        if (!response.ok) {
            let errMsg = 'API error: ' + response.status;
            try {
                const errJson = await response.json();
                if (errJson && errJson.error) {
                    errMsg = errJson.error;
                }
            } catch {}
            throw new Error(errMsg);
        }
        return response.json();
    })
    .then(data => {
        if (!Array.isArray(data)  !Array.isArray(data[0])  typeof data[0][0] !== 'object') {
            setSentiment('neutral');
            sentimentLabelDiv.textContent = 'Could not parse API response';
            return;
        }
        const result = data[0][0];
        const label = result.label;
        const score = result.score;
        if (label === 'POSITIVE' && score > 0.5) {
            setSentiment('positive');
        } else if (label === 'NEGATIVE' && score > 0.5) {
            setSentiment('negative');
        } else {
            setSentiment('neutral');
        }
    })
    .catch(err => {
        setSentiment('neutral');
        sentimentLabelDiv.textContent = '';
        showError('Sentiment analysis failed: ' + err.message);
    });
}

analyzeBtn.addEventListener('click', function() {
    hideError();
    clearSentiment();
    clearReview();
    if (reviews.length === 0) {
        showError('No reviews loaded.');
        return;
    }
    const reviewText = getRandomReview();
    if (!reviewText) {
        showError('Could not select a review.');
        return;
    }
    reviewBox.textContent = reviewText;
    const token = tokenInput.value;
    analyzeSentiment(reviewText, token);
});

window.addEventListener('DOMContentLoaded', function() {
    fetchReviews();
});
