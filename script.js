import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getDatabase, ref, push, set, query, orderByChild, limitToLast, get } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBbi7ZZPqmAsb0Y_ZAFIIo9EkNOmdmXP_U",
    authDomain: "ttpd-9b795.firebaseapp.com",
    databaseURL: "https://ttpd-9b795-default-rtdb.firebaseio.com",
    projectId: "ttpd-9b795",
    storageBucket: "ttpd-9b795.appspot.com",
    messagingSenderId: "1006590976096",
    appId: "1:1006590976096:web:9f66091e7581bf47712305",
    measurementId: "G-MEBKNCLJMY"
  };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Declare a variable to store the songs data
var songs = [];
var numQuestionsAsked = 0; // Initialize counter for the number of questions asked
var numCorrect = 0; // To keep track of correct answers

var questionElement = document.getElementById('question');
var choicesContainer = document.getElementById('choices');
var startButton = document.getElementById('start');
var feedbackElement = document.getElementById('feedback'); // To display feedback

function setImage() {
  var imgContainer = document.getElementById('gameImage');
  imgContainer.innerHTML = '<img src="TTPDlogo.png" alt="TTPD Logo" style="max-width:100%; height:auto;">';
}

// Call this function when you want to display the image, e.g., during game setup
setImage();

// Function to start the game
function startGame() {
  console.log("Starting game");
  numCorrect = 0;
  numQuestionsAsked = 0;
  feedbackElement.innerText = "";
  choicesContainer.innerHTML = '';  // Clear previous choices
  choicesContainer.style.display = 'block'; // Make sure choice buttons are visible
  startButton.innerText = "End Game"; // Change the text to 'End Game'
  startButton.classList.add('button-end-game'); // Add the darker style for end game
  startButton.removeEventListener('click', startGame); // Remove start game listener
  startButton.addEventListener('click', endGame); // Add end game listener
  document.getElementById('shareButton').style.display = 'none'; // Hide share button during gameplay
  askQuestion(); // Start the first question
}

function displayLeaderboard() {
    const db = getDatabase(); // Ensure you get the database reference correctly
    const scoresRef = query(ref(db, 'scores'), orderByChild('score'), limitToLast(5));
    get(scoresRef).then((snapshot) => {
        if (snapshot.exists()) {
            const scores = [];
            snapshot.forEach((childSnapshot) => {
                // Push each score into the array
                scores.push({
                    name: childSnapshot.val().name,
                    score: childSnapshot.val().score
                });
            });
            // Reverse the array to display the highest scores first
            scores.reverse();

            let leaderboardHTML = '<h3>Swiftie Leaderboard</h3>';
            scores.forEach((score) => {
                leaderboardHTML += `<p><strong>${score.name}</strong>: ${score.score} points</p>`;
            });
            const leaderboardDiv = document.getElementById('leaderboard');
            leaderboardDiv.innerHTML = leaderboardHTML;
            leaderboardDiv.style.display = 'block';
        } else {
            console.log("No scores available");
        }
    }).catch((error) => {
        console.error("Error fetching scores:", error);
    });
}


function updateFeedback(isCorrect, correctTitle, lyric) {
    console.log("Updating feedback...");
    feedbackElement.classList.remove('feedback-visible');
    feedbackElement.innerText = ""; // Clear text immediately

    setTimeout(() => {
        if (isCorrect) {
            feedbackElement.innerText = "Correct!";
        } else {
            feedbackElement.innerText = `Not quite! It was: ${correctTitle}`;
            saveStruggle(lyric, correctTitle); // Save the incorrect attempt for analysis
        }
        feedbackElement.classList.add('feedback-visible');
        console.log("Feedback updated and made visible.");
    }, 100);
}

// Function to save details of the struggle to Firebase
function saveStruggle(lyric, title) {
    const strugglesRef = ref(db, 'struggles');
    const newStruggleRef = push(strugglesRef);
    set(newStruggleRef, {
        lyric: lyric,
        title: title
    }).then(() => {
        console.log('Struggle saved successfully.');
    }).catch(error => {
        console.error('Failed to save struggle:', error);
    });
}


// Function to ask a new question
function askQuestion() {
    console.log("Asking new question. Total asked:", numQuestionsAsked);

    // Clear the styles of all previously selected buttons
    Array.from(choicesContainer.children).forEach(button => {
        button.classList.remove('button-selected');
        button.disabled = false;  // Re-enable the button
    });

    var randomSongIndex = Math.floor(Math.random() * songs.length);
    var randomSong = songs[randomSongIndex];
    var randomLyricIndex = Math.floor(Math.random() * randomSong.lyrics.length);
    var randomLyric = randomSong.lyrics[randomLyricIndex];

    questionElement.innerText = randomLyric;
    choicesContainer.innerHTML = ''; // Clear existing buttons

    let wrongAnswers = songs.filter((_, index) => index !== randomSongIndex)
        .map(song => song.title)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

    let correctIndex = Math.floor(Math.random() * 4);
    let answers = [...wrongAnswers.slice(0, correctIndex), randomSong.title, ...wrongAnswers.slice(correctIndex)];

    answers.forEach(answer => {
        let button = document.createElement('button');
        button.textContent = answer;
        button.className = 'choice';
        button.onclick = function() {
            this.classList.add('button-selected');
            this.disabled = true;
        
            const isCorrect = this.textContent === randomSong.title;
            if (isCorrect) {
                numCorrect++;
                updateFeedback(isCorrect, randomSong.title, randomLyric); // Include lyric in feedback
                setTimeout(askQuestion, 1000);
            } else {
                updateFeedback(isCorrect, randomSong.title, randomLyric); // Include lyric in feedback
                setTimeout(endGame, 1000);
            }
        };
        choicesContainer.appendChild(button);
    });
    
    numQuestionsAsked++; // Increment after setting up the question
}

// Function to end the game
function endGame() {
    console.log("Ending game. Total correct:", numCorrect, "out of", numQuestionsAsked);
    const playerName = document.getElementById('playerName').value || "Anonymous";  // Get player name or default to "Anonymous"
    saveScore(numCorrect, playerName); // Save the score to Firebase

    startButton.innerText = "Play Again";
    startButton.removeEventListener('click', endGame);
    startButton.addEventListener('click', startGame);

    // Ensure all answer buttons are disabled and hide them
    Array.from(choicesContainer.children).forEach(button => {
        button.disabled = true; 
        button.style.display = 'none'; 
        document.getElementById('shareButton').style.display = 'block'; // Show share button
    });

    // Update question element to show final score
    questionElement.innerHTML = `Game over! You got ${numCorrect} ${numCorrect === 1 ? 'answer' : 'answers'} right.`;

    // Display the leaderboard
    displayLeaderboard();

    feedbackElement.innerText = ""; // Clear feedback
}

function shareScoreOnX(score) {
    const tweetText = `I've just guessed ${score} TTPD ${score === 1 ? 'song' : 'songs'} correctly! Think you can do better? Try it here: https://feverdreamhigh.github.io/TTPD #TaylorSwift`;
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank'); // Opens the tweet in a new tab
}

document.getElementById('shareButton').addEventListener('click', function() {
    shareScoreOnX(numCorrect);
});


// Function to load song data and initialize game settings
function initializeGame() {
    // Load song data
    fetch('songData.json')
        .then(response => response.json())
        .then(data => {
            songs = data;
            console.log("Songs loaded successfully:", songs);
            // Set up the initial event listener for the start button
            startButton.addEventListener('click', startGame);
            console.log("Game is ready to be started.");
        })
        .catch(error => {
            console.error('Error loading the song data:', error);
            feedbackElement.innerText = "Failed to load song data. Check console for details.";
        });
}

// Function to save the score to the Firebase database
function saveScore(score, playerName) {
    console.log(`Attempting to save score: ${score}, Name: ${playerName}`); // Ensure the data is correct before sending to Firebase

    if (typeof score === 'number' && score >= 0 && score <= 1000 && typeof playerName === 'string' && playerName.trim() !== '') {
        const scoresRef = ref(db, 'scores');
        const newScoreRef = push(scoresRef);
        set(newScoreRef, {
            name: playerName,
            score: score
        }).then(() => {
            console.log('Score saved successfully.');
        }).catch(error => {
            console.error('Failed to save score:', error);
            console.error(`Detailed Firebase error: ${error.message}`);
        });
    } else {
        console.log('Failed validation. Score not saved.');
    }
}



// Event listener for when the DOM content has fully loaded
document.addEventListener('DOMContentLoaded', initializeGame);