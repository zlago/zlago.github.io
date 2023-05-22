// set cookie and theme to query string, or load theme from cookie
// least invasive way to test cookies i could find
// having to push to test cookies, what a concept

// cookie functions
function setCookie(cname, cvalue, exdays) {
	const d = new Date();
	d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
	let expires = "expires="+d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
	let name = cname + "=";
	let ca = document.cookie.split(';');
	for(let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

// set theme and save as cookie
function setTheme(newtheme) {
	setCookie("theme", newtheme, 690);
	// yes, this lets the user load invalid themes
	document.getElementById("theme").href = "/themes/" + newtheme + ".css"
}

// get theme query string
const params = new Proxy(new URLSearchParams(window.location.search), {
	get: (searchParams, prop) => searchParams.get(prop),
});

//////////////////////////////////

theme = params.theme // load theme from query string, if any
if (theme != null) {
	setTheme(theme)
} else { // load from cookie (if any) otherwise
	theme = getCookie("theme")
	if (theme != "") {
		setTheme(theme)
	}
}
