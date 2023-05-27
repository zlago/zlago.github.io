const fileInput = document.getElementById("fileinput");
let dropbox = document.getElementById("dropbox");


dropbox.addEventListener("dragenter", drag, false);
dropbox.addEventListener("dragover", drag, false);
dropbox.addEventListener("drop", dropProcess, false);
fileInput.addEventListener("input", fileProcess, false);

function drag(e) {
  e.stopPropagation();
  e.preventDefault();
}

function dropProcess(e) {
	drag(e);
	new DataTransfer()
	const dt = e.dataTransfer;
	const files = dt.files;
	for (let i = 0; i < files.length; i++) {
		deserialiseData(files[i]);
	}
}

function fileProcess(e) {
	for (let i = 0; i < this.files.length; i++) {
	deserialiseData(this.files[i]);
	}
}

// probably should figure out how to better handle this, to make it reusable for other converters (if any)
function deserialiseData(inputFile) {
	if (inputFile.size < 48) {
		// fail if too small
		alert("file too small (" + inputFile.size + " < 48)");
	} else {
		if (inputFile.size > 48) {
			// let the user convert if too big
			if (!confirm("file too big (" + inputFile.size + " > 48, OK to truncate and convert anyways)")) {return}
		}
		let filename = stripExtension(inputFile.name)
		const reader = new FileReader();
		reader.onload = (e) => {
			// put the contents of the file in the inputData array buffer
			const buffer = new Uint8Array(e.target.result, 0, 48); // apparently you NEED two lines
			const inputArray = Uint8Array.from(buffer);
			// convert
			let outputArray = convertData(inputArray);
			// and then download as filename.gbl
			serialiseData(outputArray, filename + ".gbl");
		};
		reader.readAsArrayBuffer(inputFile);
	}
}

function convertData(inArray) {
	let outArray = new Uint8Array(48);
	for (let half = 0; half < 2; half++) {
		for (let tile = 0; tile < 6; tile++) {
			// i dont know how this works i just trial and errord it
			outArray[half * 24 + tile * 4 + 0] = (inArray[half * 4 + tile * 8 + 0] & 0xf0) | ((inArray[half * 4 + tile * 8 + 1] >> 4) & 0x0f);
			outArray[half * 24 + tile * 4 + 1] = (inArray[half * 4 + tile * 8 + 2] & 0xf0) | ((inArray[half * 4 + tile * 8 + 3] >> 4) & 0x0f);
			outArray[half * 24 + tile * 4 + 2] = ((inArray[half * 4 + tile * 8 + 0] << 4) & 0xf0) | (inArray[half * 4 + tile * 8 + 1] & 0x0f);
			outArray[half * 24 + tile * 4 + 3] = ((inArray[half * 4 + tile * 8 + 2] << 4) & 0xf0) | (inArray[half * 4 + tile * 8 + 3] & 0x0f);
		}
	}
	return outArray;
}

function serialiseData(inArray, outfile) {
	// totally not stolen from stackoverflow
	var blob = new Blob([inArray]);
	var link = document.createElement('a');
	link.href = window.URL.createObjectURL(blob);
	link.download = outfile;
	link.click();
}

function stripExtension(inString) {
	let splitArray = inString.split(".");
	let outString = splitArray[0];
	for (let i = 1; i < splitArray.length - 1; i++) {
		outString += "." + splitArray[i];
	}
	return outString;
}
