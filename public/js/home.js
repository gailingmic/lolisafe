let upload = {};

upload.isPrivate = true;
upload.token = localStorage.token;
upload.maxFileSize;
// Add the album var to the upload so we can store the album id in there
upload.album;
upload.myDropzone;

upload.checkIfPublic = () => {
	axios
		.get('/api/check')
		.then(response => {
			upload.isPrivate = response.data.private;
			upload.maxFileSize = response.data.maxFileSize;
			upload.preparePage();
		})
		.catch(error => {
			swal(
				'An error ocurred',
				'There was an error with the request, please check the console for more information.',
				'error'
			);
			return console.log(error);
		});
};

upload.preparePage = () => {
	if (!upload.isPrivate) return upload.prepareUpload();
	if (!upload.token) return document.getElementById('loginToUpload').style.display = 'inline-flex';
	upload.verifyToken(upload.token, true);
};

upload.verifyToken = (token, reloadOnError) => {
	if (reloadOnError === undefined) reloadOnError = false;

	axios
		.post('/api/tokens/verify', { token: token })
		.then(response => {
			if (response.data.success === false) {
				swal(
					{
						title: 'An error ocurred',
						text: response.data.description,
						type: 'error'
					},
					() => {
						if (reloadOnError) {
							localStorage.removeItem('token');
							location.reload();
						}
					}
				);
				return;
			}

			localStorage.token = token;
			upload.token = token;
			return upload.prepareUpload();
		})
		.catch(error => {
			swal(
				'An error ocurred',
				'There was an error with the request, please check the console for more information.',
				'error'
			);
			return console.log(error);
		});
};

upload.prepareUpload = () => {
	// I think this fits best here because we need to check for a valid token before we can get the albums
	if (upload.token) {
		const select = document.getElementById('albumSelect');

		select.addEventListener('change', () => {
			upload.album = select.value;
		});

		axios
			.get('/api/albums', { headers: { token: upload.token } })
			.then(res => {
				const albums = res.data.albums;

				// If the user doesn't have any albums we don't really need to display
				// an album selection
				if (albums.length === 0) return;

				// Loop through the albums and create an option for each album
				for (const i = 0; i < albums.length; i++) {
					const opt = document.createElement('option');
					opt.value = albums[i].id;
					opt.innerHTML = albums[i].name;
					select.appendChild(opt);
				}
				// Display the album selection
				document.getElementById('albumDiv').style.display = 'block';
			})
			.catch(e => {
				swal(
					'An error ocurred',
					'There was an error with the request, please check the console for more information.',
					'error'
				);
				return console.log(e);
			});
	}

	div = document.createElement('div');
	div.id = 'dropzone';
	div.innerHTML = 'Click here or drag and drop files';
	div.style.display = 'flex';

	document.getElementById('maxFileSize').innerHTML = `Maximum upload size per file is${upload.maxFileSize}`;
	document.getElementById('loginToUpload').style.display = 'none';

	if (upload.token === undefined) document.getElementById('loginLinkText').innerHTML = 'Create an account and keep track of your uploads';

	document.getElementById('uploadContainer').appendChild(div);

	upload.prepareDropzone();
};

upload.prepareDropzone = () => {
	const previewNode = document.querySelector('#template');
	previewNode.id = '';
	const previewTemplate = previewNode.parentNode.innerHTML;
	previewNode.parentNode.removeChild(previewNode);

	const dropzone = new Dropzone('div#dropzone', {
		url: '/api/upload',
		paramName: 'files[]',
		maxFilesize: upload.maxFileSize.slice(0, -2),
		parallelUploads: 2,
		uploadMultiple: false,
		previewsContainer: 'div#uploads',
		previewTemplate: previewTemplate,
		createImageThumbnails: false,
		maxFiles: 1000,
		autoProcessQueue: true,
		headers: { token: upload.token },
		init: function() {
			upload.myDropzone = this;
			this.on('addedfile', file => {
				document.getElementById('uploads').style.display = 'block';
			});
			// Add the selected albumid, if an album is selected, as a header
			this.on('sending', (file, xhr) => {
				if (upload.album) {
					xhr.setRequestHeader('albumid', upload.album);
				}
			});
		}
	});

	// Update the total progress bar
	dropzone.on('uploadprogress', (file, progress) => {
		file.previewElement.querySelector('.progress').setAttribute('value', progress);
		file.previewElement.querySelector('.progress').innerHTML = `${progress}%`;
	});

	dropzone.on('success', (file, response) => {
		// Handle the responseText here. For example, add the text to the preview element:

		if (response.success === false) {
			const p = document.createElement('p');
			p.innerHTML = response.description;
			file.previewTemplate.querySelector('.link').appendChild(p);
		}

		if (response.files[0].url) {
			a = document.createElement('a');
			a.href = response.files[0].url;
			a.target = '_blank';
			a.innerHTML = response.files[0].url;
			file.previewTemplate.querySelector('.link').appendChild(a);

			file.previewTemplate.querySelector('.progress').style.display = 'none';
		}
	});

	upload.prepareShareX();
};

upload.prepareShareX = () => {
	if (upload.token) {
		const sharexElement = document.getElementById('ShareX');
		const sharexFile = `{
		  "Name": "${location.hostname}",
		  "DestinationType": "ImageUploader, FileUploader",
		  "RequestType": "POST",
		  "RequestURL": "${location.origin}/api/upload",
		  "FileFormName": "files[]",
		  "Headers": {
		    "token": "${upload.token}"
		  },
		  "ResponseType": "Text",
		  "URL": "$json:files[0].url$",
		  "ThumbnailURL": "$json:files[0].url$",
		  "DeletionURL": "$json:files[0].deleteUrl$"
		}`;

		const sharexBlob = new Blob([sharexFile], { type: 'application/octet-binary' });
		sharexElement.setAttribute('href', URL.createObjectURL(sharexBlob));
		sharexElement.setAttribute('download', `${location.hostname}.sxcu`);
	}
};

// Handle image paste event
window.addEventListener('paste', event => {
	const items = (event.clipboardData || event.originalEvent.clipboardData).items;
	for (index in items) {
		const item = items[index];
		if (item.kind === 'file') {
			const blob = item.getAsFile();
			console.log(blob.type);
			const file = new File([blob], `pasted-image.${blob.type.match(/(?:[^\/]*\/)([^;]*)/)[1]}`);
			file.type = blob.type;
			console.log(file);
			upload.myDropzone.addFile(file);
		}
	}
});

window.onload = () => {
	upload.checkIfPublic();
};
