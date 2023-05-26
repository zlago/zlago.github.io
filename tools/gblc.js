const fileInput = document.getElementById("fileinput");
let dropbox = document.getElementById("dropbox");


dropbox.addEventListener("dragenter", drag, false);
dropbox.addEventListener("dragover", drag, false);
// dropbox.addEventListener("drop", drop, false);
fileInput.addEventListener("change", deserialiseData, false);

function drag(e) {
  e.stopPropagation();
  e.preventDefault();
}

function drop(e) {
	drag(e);

	const dt = e.dataTransfer;
	const files = dt.files;
	deserialiseData(files);
}

function deserialiseData() {
	const selectedFile = this.files[0]; // fetch the first uploaded file
	if (selectedFile.size == 48) {
		const reader = new FileReader();
		reader.onload = (e) => {
			// put the contents of the file in the fileData array buffer
			const buffer = new Uint8Array(e.target.result);
			const inputArray = Uint8Array.from(buffer);
			let outputArray = convertData(inputArray);
			serialiseData(outputArray)
		};
		reader.readAsArrayBuffer(selectedFile);
	} else {
		alert("invalid input size (" + selectedFile.size + " != 48)");
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

function serialiseData(inArray) {
	// totally not stolen from stackoverflow
	var blob = new Blob([inArray]);
	var link = document.createElement('a');
	link.href = window.URL.createObjectURL(blob);
	link.download = "out.gbl";
	link.click();
}