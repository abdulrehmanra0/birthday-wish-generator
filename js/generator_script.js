document.addEventListener('DOMContentLoaded', () => {
    const recipientNameInput = document.getElementById('recipientName');
    const greetingTextInput = document.getElementById('greetingText');
    const birthdayMessageInput = document.getElementById('birthdayMessage');
    const wishTextInput = document.getElementById('wishText');
    const profilePhotoInput = document.getElementById('profilePhoto');
    const photoPreview = document.getElementById('photoPreview');
    const songChoiceSelect = document.getElementById('songChoice');
    const youtubeLinkInputDiv = document.getElementById('youtubeLinkInput');
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    const mp3UploadInputDiv = document.getElementById('mp3UploadInput');
    const mp3FileInput = document.getElementById('mp3File');
    const generateBtn = document.getElementById('generateBtn');

    // Show/hide song input fields based on choice
    songChoiceSelect.addEventListener('change', function() {
        youtubeLinkInputDiv.style.display = this.value === 'youtube' ? 'block' : 'none';
        mp3UploadInputDiv.style.display = this.value === 'upload' ? 'block' : 'none';
    });

    profilePhotoInput.addEventListener('change', function(event) {
        if (event.target.files && event.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                photoPreview.src = e.target.result;
                photoPreview.style.display = 'block';
            }
            reader.readAsDataURL(event.target.files[0]);
        } else {
            photoPreview.style.display = 'none';
        }
    });

    generateBtn.addEventListener('click', async () => {
        try {
            const recipientName = recipientNameInput.value.trim() || "There"; // Default if empty
            const greetingText = greetingTextInput.value.trim();
            let birthdayMessage = birthdayMessageInput.value.trim();
            const wishText = wishTextInput.value.trim();
            const profilePhotoFile = profilePhotoInput.files[0];
            const songChoice = songChoiceSelect.value;
            const youtubeUrl = youtubeUrlInput.value.trim();
            const mp3File = mp3FileInput.files[0];

            // --- 1. Get the HTML Template ---
            // For simplicity, embedding the template here.
            // In a real app, you might fetch it or have it as a separate .js file.
            let htmlTemplate = getBirthdayHTMLTemplate(); // Defined below or fetched

            // --- 2. Replace Placeholders ---
            htmlTemplate = htmlTemplate.replace(/\{\{PAGE_TITLE\}\}/g, `Happy Birthday ${recipientName}! 💖`);
            htmlTemplate = htmlTemplate.replace(/\{\{RECIPIENT_NAME\}\}/g, recipientName.toUpperCase()); // Original uses uppercase in one spot
            htmlTemplate = htmlTemplate.replace(/\{\{GREETING_TEXT\}\}/g, greetingText);
            // Replace message placeholder, ensuring recipient name is dynamic within it
            birthdayMessage = birthdayMessage.replace(/\{\{RECIPIENT_NAME\}\}/g, recipientName);
            htmlTemplate = htmlTemplate.replace(/\{\{BIRTHDAY_MESSAGE\}\}/g, birthdayMessage);
            htmlTemplate = htmlTemplate.replace(/\{\{WISH_TEXT\}\}/g, wishText);


            const zip = new JSZip();
            const imgFolder = zip.folder("img");
            const musicFolder = zip.folder("music");

            // --- 3. Handle Profile Photo ---
            let profileImagePath = "img/Noor.png"; // Default path in template
            if (profilePhotoFile) {
                // Option A: Embed as Base64 (simplifies ZIP, but larger HTML)
                // const photoBase64 = await readFileAsDataURL(profilePhotoFile);
                // htmlTemplate = htmlTemplate.replace(/\{\{PROFILE_IMAGE_SRC\}\}/g, photoBase64);
                // profileImagePath remains default as it's now embedded

                // Option B: Add to ZIP and link (better for separate files)
                const photoFileName = `profile_${Date.now()}.${profilePhotoFile.name.split('.').pop()}`;
                profileImagePath = `img/${photoFileName}`;
                imgFolder.file(photoFileName, profilePhotoFile);
                htmlTemplate = htmlTemplate.replace("./img/Noor.png", profileImagePath); // Exact match to template
            } else {
                 // If no photo uploaded, but you want to allow removing default, you'd need logic here
                 // For now, it will use the default "Noor.png" if nothing uploaded, assuming Noor.png is in template_assets/img/
            }


            // --- 4. Handle Song ---
            let audioPlayerHTML = `<source src="music/hbd.mp3">\nYour browser isn't invited for super fun audio time.`; // Default
            let defaultSongPath = "music/hbd.mp3"; // Relative path for default song

            if (songChoice === 'youtube' && youtubeUrl) {
                const videoId = extractVideoID(youtubeUrl);
                if (videoId) {
                    audioPlayerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="display:none;"></iframe>`;
                    // For YouTube, we might want to hide the <audio> tag or replace it entirely
                    htmlTemplate = htmlTemplate.replace(/<audio class="song" loop autoplay>[\s\S]*?<\/audio>/,
                                                        `<div class="song-container" style="visibility:hidden; height:0; width:0; overflow:hidden;">${audioPlayerHTML}</div>`);
                }
            } else if (songChoice === 'upload' && mp3File) {
                const songFileName = `custom_song_${Date.now()}.mp3`;
                musicFolder.file(songFileName, mp3File);
                audioPlayerHTML = `<source src="music/${songFileName}">\nYour browser isn't invited for super fun audio time.`;
                htmlTemplate = htmlTemplate.replace(/<source src="[^"]*">/, `<source src="music/${songFileName}">`);
            } else if (songChoice === 'none') {
                htmlTemplate = htmlTemplate.replace(/<audio class="song" loop autoplay>[\s\S]*?<\/audio>/, '<!-- Audio removed by user -->');
            } else { // Default song
                 // Ensure default hbd.mp3 is added to ZIP from template_assets
            }


            // --- 5. Add static assets to ZIP ---
            // These paths are relative to where generator_script.js is running from
            // You'll need to fetch these files. This is a simplified example.
            // In a real app, you'd list them or fetch a manifest.
            const staticImageAssets = [
                "template_assets/img/favicon.png", "template_assets/img/hat.svg",
                "template_assets/img/ballon1.svg", "template_assets/img/ballon2.svg", "template_assets/img/ballon3.svg"
            ];
            // Add default profile image if not overridden and it's meant to be bundled
            if (!profilePhotoFile) { // if no custom photo, ensure default is available
                staticImageAssets.push("template_assets/img/Noor.png");
            }


            for (const assetPath of staticImageAssets) {
                const fileName = assetPath.substring(assetPath.lastIndexOf('/') + 1);
                try {
                    const response = await fetch(assetPath);
                    if (!response.ok) throw new Error(`Failed to fetch ${assetPath}: ${response.statusText}`);
                    const blob = await response.blob();
                    imgFolder.file(fileName, blob);
                } catch (error) {
                    console.warn(`Could not load static asset ${assetPath}: ${error}. It might be missing or path is incorrect.`);
                }
            }

            // Add default music if selected and not overridden by YouTube/upload
            if (songChoice === 'default' || (!mp3File && songChoice !== 'youtube' && songChoice !== 'none')) {
                 try {
                    const response = await fetch("template_assets/music/hbd.mp3"); // Path to your default song
                    if (!response.ok) throw new Error(`Failed to fetch default song: ${response.statusText}`);
                    const blob = await response.blob();
                    musicFolder.file("hbd.mp3", blob); // Ensure this matches the src in the template if default
                } catch (error) {
                    console.warn(`Could not load default song: ${error}. Ensure template_assets/music/hbd.mp3 exists.`);
                }
            }


            // --- 6. Add Generated HTML to ZIP ---
            zip.file("index.html", htmlTemplate);

            // --- 7. Generate and Download ZIP ---
            const zipBlob = await zip.generateAsync({ type: "blob" });
            saveAs(zipBlob, `birthday_wish_for_${recipientName.replace(/\s+/g, '_')}.zip`);

            alert('Birthday website ZIP generated successfully!');

        } catch (error) {
            console.error("Error generating ZIP:", error);
            alert("Error generating website: " + error.message);
        }
    });

    // Helper to read file as Data URL
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Helper to extract YouTube Video ID
    function extractVideoID(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    // --- Your Original HTML as a Template String ---
    // IMPORTANT: Identify placeholders carefully.
    function getBirthdayHTMLTemplate() {
        // Make sure paths to assets like balloons, hat, favicon are relative (e.g., "img/favicon.png")
        // as they will be in the 'img' folder of the generated ZIP.
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <link rel="shortcut icon" type="image/png" href="img/favicon.png" />
    <title>{{PAGE_TITLE}}</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Poppins:wght@300;400&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #fce2e6, #e6e6fa, #d4f1f4);
            height: 100vh;
            overflow: hidden;
            position: relative;
        }

        canvas#particles {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
        }

        .song { /* This class is for the <audio> tag */
            visibility: hidden;
        }
        /* If using YouTube iframe, you might want to hide it too */
        .song-container iframe {
            position: absolute;
            top: -9999px;
            left: -9999px;
        }


        .container {
            height: 100vh;
            margin: 0 auto;
            overflow: hidden;
            position: relative;
            text-align: center;
            visibility: hidden;
            width: 100vw;
            padding: 20px;
        }

        .container > div {
            left: 0;
            position: absolute;
            right: 0;
            top: 15vh;
        }

        .one h1.one { /* More specific selector */
            font-family: 'Playfair Display', serif;
            font-size: 4rem;
            color: #ff6f91;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        }

        .one #name { /* This is for the recipient's name in the greeting */
            color: #ffb6c1;
            font-weight: 700;
        }

        .two {
            font-size: 1.5rem;
            color: #6b7280;
            font-weight: 300;
            margin-top: 10px;
        }

        .three {
            font-size: 2.5rem;
            color: #ff6f91;
            font-family: 'Playfair Display', serif;
        }

        .four .text-box {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 15px;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
            margin: 0 auto;
            padding: 20px;
            padding-bottom: 60px; /* Extra space for the fake-btn overlap */
            width: 90%;
            max-width: 700px;
            position: relative;
            overflow: hidden;
            height: fit-content; 
            -webkit-height: auto; 
        }

        .four .text-box::before {
            content: '';
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            background: linear-gradient(45deg, #ffb6c1, #d4f1f4);
            opacity: 0.2;
            z-index: -1;
            transform: rotate(2deg);
        }

        .hbd-chatbox {
            font-family: 'Poppins', sans-serif;
            font-size: 1.2rem;
            color: #4a5568;
            line-height: 1.6;
            text-align: left;
            white-space: pre-wrap; /* To respect newlines from textarea */
        }

        .hbd-chatbox span {
            visibility: hidden;
        }

        .fake-btn {
            background: linear-gradient(45deg, #ff6f91, #ffb6c1);
            border-radius: 10px;
            color: #fff;
            padding: 10px 20px;
            position: absolute;
            bottom: -40px; /* Adjusted if padding-bottom of text-box changes */
            right: 10px;
            font-size: 0.9rem;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            transition: transform 0.3s ease;
        }

        .fake-btn:hover {
            transform: scale(1.05);
        }

        .five p {
            font-size: 2rem;
            color: #6b7280;
            font-weight: 300;
        }

        .idea-3 strong, .idea-4 strong {
            background: #d4f1f4;
            padding: 5px 10px;
            border-radius: 5px;
        }

        /* .idea-5 { font-size: 3.5rem; color: #ff6f91; } Idea-5 seems to be missing text content in original */
        
        .idea-6 span {
            font-size: 10rem; 
            color: #ffb6c1;
        }

        .idea-6 span:nth-child(1) {
            transform: rotate(-10deg); 
            display: inline-block; 
        }

        .idea-6 span:nth-child(2) {
            transform: rotate(10deg); 
            display: inline-block; 
        }

        .six {
            text-align: center;
        }

        .profile-picture {
            width: 50%;
            max-width: 300px;
            border-radius: 15px;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
            background: #fff;
            padding: 10px;
            transform: rotate(-5deg);
        }

        .hat {
            position: absolute;
            top: -20%;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
        }

        .wish-hbd {
            font-family: 'Playfair Display', serif;
            font-size: 2.5rem;
            color: #ff6f91;
            margin-top: 20px;
        }

        .wish h5 {
            font-size: 1.5rem;
            color: #6b7280;
            font-weight: 300;
        }

        .baloons img {
            position: absolute;
            width: 50px;
        }

        .baloons img:nth-child(even) { left: -10%; }
        .baloons img:nth-child(odd) { right: -10%; }
        .baloons img:nth-child(3n + 0) { left: 30%; }

        .seven, .eight {
            height: 100vh;
            position: fixed;
            top: 0;
            width: 100vw;
        }

        .eight svg {
            position: absolute;
            width: 30px;
            visibility: hidden;
            z-index: -1;
        }

        .eight svg:nth-child(1) { fill: #ffb6c1; left: 5vw; top: 10vh; }
        .eight svg:nth-child(2) { fill: #d4f1f4; left: 35vw; top: 20vh; }
        .eight svg:nth-child(3) { fill: #ff6f91; left: 20vw; top: 30vh; }
        .eight svg:nth-child(4) { fill: #e6e6fa; left: 50vw; top: 40vh; }
        .eight svg:nth-child(5) { fill: #fce2e6; left: 10vw; top: 60vh; }
        .eight svg:nth-child(6) { fill: #ffb6c1; left: 70vw; top: 50vh; }
        .eight svg:nth-child(7) { fill: #d4f1f4; left: 80vw; top: 70vh; }
        .eight svg:nth-child(8) { fill: #ff6f91; left: 40vw; top: 80vh; }
        .eight svg:nth-child(9) { fill: #e6e6fa; left: 90vw; top: 90vh; }

        .nine p {
            font-size: 1.8rem;
            color: #6b7280;
            font-weight: 300;
        }

        #replay {
            cursor: pointer;
            color: #ff6f91;
            font-weight: 700;
        }

        @media screen and (max-width: 768px) {
            .one h1.one { font-size: 3rem; }
            .two { font-size: 1.2rem; }
            .three { font-size: 2rem; }
            .hbd-chatbox { font-size: 1rem; }
            /* .idea-5 { font-size: 2.5rem; } */
            .idea-6 span { font-size: 6rem; } 
            .wish-hbd { font-size: 2rem; }
            .wish h5 { font-size: 1.2rem; }
            .nine p { font-size: 1.5rem; }
            .profile-picture { width: 70%; }
            .hat { width: 60px; top: -15%; }
            .baloons img { width: 40px; }
        }
    </style>
</head>
<body>
    <audio class="song" loop autoplay>
        <!-- This source will be replaced or the whole tag might be -->
        <source src="music/hbd.mp3">
        Your browser isn't invited for super fun audio time.
    </audio>

    <canvas id="particles"></canvas>

    <div class="container">
        <div class="one">
            <h1 class="one">
                Hi
                <span id="name">{{RECIPIENT_NAME}}</span>
            </h1>
            <p class="two" id="greetingText">{{GREETING_TEXT}}</p>
        </div>

        <div class="three">
            <p>It's your birthday!! :D 🎉</p>
        </div>

        <div class="four">
            <div class="text-box">
                <p class="hbd-chatbox">{{BIRTHDAY_MESSAGE}}</p>
                <p class="fake-btn" id="sendLoveBtn">Send Love</p>
            </div>
        </div>

        <div class="five">
            <p class="idea-1">That's what I was going to do.</p>
            <p class="idea-2">But then I stopped</p>
            <p class="idea-3"> I realised, I wanted to do something<br>
                <strong>special</strong></p>
            <p class="idea-4">Because you’re <strong>Special</strong>.</p>
            <p class="idea-6"><span>S</span><span>O</span></p>
        </div>

        <div class="six">
            <img src="./img/Noor.png" alt="profile" class="profile-picture" id="imagePath"/>
            <img src="img/hat.svg" alt="hat" class="hat" />
            <div class="wish">
                <h3 class="wish-hbd">Happy Birthday!</h3>
                <h5 id="wishText">{{WISH_TEXT}}</h5>
            </div>
        </div>

        <div class="seven">
            <div class="baloons">
                <img src="img/ballon2.svg" alt="" />
                <img src="img/ballon1.svg" alt="" />
                <img src="img/ballon3.svg" alt="" />
                <img src="img/ballon1.svg" alt="" />
                <img src="img/ballon2.svg" alt="" />
                <img src="img/ballon3.svg" alt="" />
                <img src="img/ballon2.svg" alt="" />
                <img src="img/ballon3.svg" alt="" />
                <img src="img/ballon1.svg" alt="" />
                <img src="img/ballon2.svg" alt="" />
                <img src="img/ballon3.svg" alt="" />
                <img src="img/ballon2.svg" alt="" />
                <img src="img/ballon1.svg" alt="" />
                <img src="img/ballon3.svg" alt="" />
                <img src="img/ballon2.svg" alt="" />
                <img src="img/ballon3.svg" alt="" />
                <img src="img/ballon1.svg" alt="" />
                <img src="img/ballon2.svg" alt="" />
                <img src="img/ballon1.svg" alt="" />
                <img src="img/ballon3.svg" alt="" />
                <img src="img/ballon3.svg" alt="" />
                <img src="img/ballon1.svg" alt="" />
                <img src="img/ballon2.svg" alt="" />
                <img src="img/ballon3.svg" alt="" />
                <img src="img/ballon2.svg" alt="" />
                <img src="img/ballon1.svg" alt="" />
                <img src="img/ballon3.svg" alt="" />
                <img src="img/ballon2.svg" alt="" />
                <img src="img/ballon3.svg" alt="" />
                <img src="img/ballon1.svg" alt="" />
                <img src="img/ballon2.svg" alt="" />
                <img src="img/ballon1.svg" alt="" />
                <img src="img/ballon3.svg" alt="" />
            </div>
        </div>

        <div class="eight">
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" /></svg>
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" /></svg>
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" /></svg>
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" /></svg>
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" /></svg>
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" /></svg>
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" /></svg>
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" /></svg>
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" /></svg>
        </div>

        <div class="nine">
            <p>Hope you loved this surprise!</p>
            <p id="replay">Click to replay the magic! ✨</p>
            <p class="last-smile">💖</p>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.5/gsap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script>
        // Particles background (Identical to original)
        const canvas = document.getElementById('particles');
        const ctx = canvas.getContext('2d');
        if (canvas) { // Check if canvas exists
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const particlesArray = [];
            const numberOfParticles = 50;

            class Particle { /* ... same as original ... */ 
                constructor() {
                    this.x = Math.random() * canvas.width;
                    this.y = Math.random() * canvas.height;
                    this.size = Math.random() * 5 + 2;
                    this.speedX = Math.random() * 0.5 - 0.25;
                    this.speedY = Math.random() * 0.5 - 0.25;
                    this.color = \`rgba(\${Math.random() * 255}, \${Math.random() * 255}, \${Math.random() * 255}, 0.3)\`;
                }
                update() {
                    this.x += this.speedX;
                    this.y += this.speedY;
                    if (this.size > 0.2) this.size -= 0.1;
                }
                draw() {
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            function handleParticles() {
                for (let i = 0; i < particlesArray.length; i++) {
                    particlesArray[i].update();
                    particlesArray[i].draw();
                    if (particlesArray[i].size <= 0.2) {
                        particlesArray.splice(i, 1);
                        i--;
                        particlesArray.push(new Particle());
                    }
                }
            }

            function animateParticles() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                handleParticles();
                requestAnimationFrame(animateParticles);
            }

            for (let i = 0; i < numberOfParticles; i++) {
                particlesArray.push(new Particle());
            }
            animateParticles();
        }


        // Animation timeline (Identical to original)
        window.addEventListener('load', () => {
            // Check if SweetAlert2 is loaded
            if (typeof Swal !== 'undefined') {
                const songElement = document.querySelector('.song'); // Check if song element exists
                if (songElement || document.querySelector('.song-container iframe')) { // If audio tag or YT iframe
                    Swal.fire({
                        title: 'Play some birthday tunes?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#ff6f91',
                        cancelButtonColor: '#d4f1f4',
                        confirmButtonText: 'Yes, please!',
                        cancelButtonText: 'No, thanks'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            if (songElement && typeof songElement.play === 'function') { // Standard audio
                                songElement.play().catch(e => console.error("Audio play failed:", e));
                            }
                            // YouTube will autoplay due to ?autoplay=1 in src
                            animationTimeline();
                        } else {
                            animationTimeline();
                        }
                    });
                } else { // No song element, just start animation
                    animationTimeline();
                }
            } else { // SweetAlert not loaded, just start animation
                animationTimeline();
            }
        });

        const animationTimeline = () => {
            // Split text for typing animation
            const textBox = document.querySelector(".hbd-chatbox");
            if (textBox && textBox.textContent) { // Check if textBox exists and has content
                const textContent = textBox.textContent;
                textBox.innerHTML = textContent.split("").map(char => \`<span>\${char}</span>\`).join("");
            }
            
            const hbd = document.querySelector(".wish-hbd");
            if (hbd && hbd.textContent) { // Check if hbd exists and has content
                hbd.innerHTML = hbd.textContent.split("").map(char => \`<span>\${char}</span>\`).join("");
            }


            const ideaTextTrans = { opacity: 0, y: -20, rotationX: 5, skewX: "15deg" };
            const ideaTextTransLeave = { opacity: 0, y: 20, rotationY: 5, skewX: "-15deg" };

            const tl = gsap.timeline();

            tl.to(".container", { duration: 0.6, visibility: "visible" })
                .from(".one", { duration: 0.7, opacity: 0, y: 10 })
                .from(".two", { duration: 0.4, opacity: 0, y: 10 })
                .to(".one", { duration: 0.7, opacity: 0, y: 10 }, "+=2") // Adjusted time as per original
                .to(".two", { duration: 0.7, opacity: 0, y: 10 }, "-=1") // Adjusted time as per original
                .from(".three", { duration: 0.7, opacity: 0, y: 10 })
                .to(".three", { duration: 0.7, opacity: 0, y: 10 }, "+=2") // Adjusted time as per original
                .from(".four", { duration: 0.7, scale: 0.2, opacity: 0 })
                .from(".fake-btn", { duration: 0.3, scale: 0.2, opacity: 0 });

            // Only run stagger if chatbox spans exist
            if (document.querySelectorAll(".hbd-chatbox span").length > 0) {
                tl.staggerTo(".hbd-chatbox span", 0.05, { visibility: "visible" }, 0.05);
            }
                
            tl.to(".fake-btn", { duration: 0.1, background: "linear-gradient(45deg, #d4f1f4, #ff6f91)" }, "+=2") // Adjusted time
                .to(".four", { duration: 0.5, scale: 0.2, opacity: 0, y: -150 }, "+=10") // Keep the long delay for message reading
                .from(".idea-1", { duration: 0.7, ...ideaTextTrans })
                .to(".idea-1", { duration: 0.7, ...ideaTextTransLeave }, "+=1")
                .from(".idea-2", { duration: 0.7, ...ideaTextTrans })
                .to(".idea-2", { duration: 0.7, ...ideaTextTransLeave }, "+=1")
                .from(".idea-3", { duration: 0.7, ...ideaTextTrans })
                .to(".idea-3 strong", { duration: 0.5, scale: 1.2, x: 10, backgroundColor: "#ff6f91", color: "#fff" })
                .to(".idea-3", { duration: 0.7, ...ideaTextTransLeave }, "+=1")
                .from(".idea-4", { duration: 0.7, ...ideaTextTrans })
                .to(".idea-4 strong", { duration: 0.5, scale: 1.2, x: 10, backgroundColor: "#ff6f91", color: "#fff" })
                .to(".idea-4", { duration: 0.7, ...ideaTextTransLeave }, "+=1")
                // .from(".idea-5", { duration: 0.7, rotationX: 15, rotationZ: -10, skewY: "-5deg", y: 50, z: 10, opacity: 0 }, "+=0.5")
                // .to(".idea-5 span", { duration: 0.7, rotation: 90, x: 8 }, "+=1") // Original .idea-5 was empty text, check if this is still intended
                // .to(".idea-5", { duration: 0.7, scale: 0.2, opacity: 0 }, "+=1")
                .staggerFrom(".idea-6 span", 0.8, { scale: 3, opacity: 0, rotation: 15, ease: "expo.out" }, 0.2, "+=0.5") // Added delay here after removing idea-5
                .staggerTo(".idea-6 span", 0.8, { scale: 3, opacity: 0, rotation: -15, ease: "expo.out" }, 0.2, "+=1")
                .staggerFromTo(".baloons img", 2.5, { opacity: 0.9, y: 1400 }, { opacity: 1, y: -1000 }, 0.2)
                .from(".profile-picture", { duration: 0.5, scale: 3.5, opacity: 0, x: 25, y: -25, rotationZ: -45 }, "-=2")
                .from(".hat", { duration: 0.5, x: -100, y: 350, rotation: -180, opacity: 0 });
            
            // Only run stagger if wish-hbd spans exist
            if (document.querySelectorAll(".wish-hbd span").length > 0) {
                tl.staggerFrom(".wish-hbd span", 0.7, { opacity: 0, y: -50, rotation: 150, skewX: "30deg", ease: "elastic.out(1,0.5)" }, 0.1)
                  .staggerFromTo(".wish-hbd span", 0.7, { scale: 1.4, rotationY: 150 }, { scale: 1, rotationY: 0, color: "#ffb6c1", ease: "expo.out" }, 0.1, "party");
            }

            tl.from(".wish h5", { duration: 0.5, opacity: 0, y: 10, skewX: "-15deg" }, "party") // Ensure this is part of "party" or adjust timing
                .staggerTo(".eight svg", 1.5, { visibility: "visible", opacity: 0, scale: 80, repeat: 3, repeatDelay: 1.4 }, 0.3)
                .to(".six", { duration: 0.5, opacity: 0, y: 30, zIndex: "-1" })
                .staggerFrom(".nine p", 1, ideaTextTrans, 1.2)
                .to(".last-smile", { duration: 0.5, rotation: 90 }, "+=1");

            const replayBtn = document.getElementById("replay");
            if (replayBtn) {
                replayBtn.addEventListener("click", () => {
                    tl.restart();
                });
            }

            const sendLoveBtn = document.getElementById("sendLoveBtn");
            if (sendLoveBtn && typeof confetti === 'function') {
                sendLoveBtn.addEventListener("click", () => {
                    confetti({
                        particleCount: 150,
                        spread: 90,
                        origin: { y: 0.6 },
                        colors: ['#ff6f91', '#ffb6c1', '#fce2e6', '#d4f1f4']
                    });
                });
            }

            // Animated Page Title
            const originalTitle = document.title; // This will be the generated title
            const titleEmojis = ["💖", "🎉", "🎂", "✨", "🥳"];
            let currentEmojiIndex = 0;
            setInterval(() => {
                // Base title should already be set to "Happy Birthday {{RECIPIENT_NAME}}!"
                // We just append/change the emoji
                const baseTitleWithoutEmoji = originalTitle.replace(/[💖🎉🎂✨🥳]/g, '').trim();
                document.title = baseTitleWithoutEmoji + " " + titleEmojis[currentEmojiIndex];
                currentEmojiIndex = (currentEmojiIndex + 1) % titleEmojis.length;
            }, 2000); 
        };
    </script>
</body>
</html>
        `;
    }
});