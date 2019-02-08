let panel = {};

panel.page;
panel.username;
panel.token = localStorage.token;
panel.filesView = localStorage.filesView;

panel.preparePage = () => {
	if (!panel.token) return window.location = '/auth';
	panel.verifyToken(panel.token, true);
};

panel.verifyToken = (token, reloadOnError) => {
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
							location.location = '/auth';
						}
					}
				);
				return;
			}

			axios.defaults.headers.common.token = token;
			localStorage.token = token;
			panel.token = token;
			panel.username = response.data.username;
			return panel.prepareDashboard();
		})
		.catch(error => {
			return swal(
				'An error ocurred',
				'There was an error with the request, please check the console for more information.',
				'error'
			);
			console.log(error);
		});
};

panel.prepareDashboard = () => {
	panel.page = document.getElementById('page');
	document.getElementById('auth').style.display = 'none';
	document.getElementById('dashboard').style.display = 'block';

	document.getElementById('itemUploads').addEventListener('click', () => {
		panel.setActiveMenu(this);
	});

	document.getElementById('itemManageGallery').addEventListener('click', () => {
		panel.setActiveMenu(this);
	});

	document.getElementById('itemTokens').addEventListener('click', () => {
		panel.setActiveMenu(this);
	});

	document.getElementById('itemPassword').addEventListener('click', () => {
		panel.setActiveMenu(this);
	});

	document.getElementById('itemLogout').innerHTML = `Logout ( ${panel.username} )`;

	panel.getAlbumsSidebar();
};

panel.logout = () => {
	localStorage.removeItem('token');
	location.reload('/');
};

panel.getUploads = (album = undefined, page = undefined) => {
	if (page === undefined) page = 0;

	let url = `/api/uploads/${page}`;
	if (album !== undefined) url = `/api/album/${album}/${page}`;

	axios
		.get(url)
		.then(response => {
			if (response.data.success === false) {
				if (response.data.description === 'No token provided') return panel.verifyToken(panel.token);
				else return swal('An error ocurred', response.data.description, 'error');
			}

			let prevPage = 0;
			let nextPage = page + 1;

			if (response.data.files.length < 25) nextPage = page;

			if (page > 0) prevPage = page - 1;

			panel.page.innerHTML = '';
			const container = document.createElement('div');
			const pagination = `<nav class="pagination is-centered">
					  		<a class="pagination-previous" onclick="panel.getUploads(${album}, ${prevPage} )">Previous</a>
					  		<a class="pagination-next" onclick="panel.getUploads(${album}, ${nextPage} )">Next page</a>
						</nav>`;
			const listType = `
		<div class="columns">
			<div class="column">
				<a class="button is-small is-outlined is-danger" title="List view" onclick="panel.setFilesView('list', ${album}, ${page})">
					<span class="icon is-small">
						<i class="fa fa-list-ul"></i>
					</span>
				</a>
				<a class="button is-small is-outlined is-danger" title="List view" onclick="panel.setFilesView('thumbs', ${album}, ${page})">
					<span class="icon is-small">
						<i class="fa fa-th-large"></i>
					</span>
				</a>
			</div>
		</div>`;

			if (panel.filesView === 'thumbs') {
				container.innerHTML = `
				${pagination}
				<hr>
				${listType}
				<div class="columns is-multiline is-mobile" id="table">

				</div>
				${pagination}
			`;

				panel.page.appendChild(container);
				const table = document.getElementById('table');

				for (const item of response.data.files) {
					const div = document.createElement('div');
					div.className = 'column is-2';
					if (item.thumb !== undefined) {
						div.innerHTML = `<a href="${item.file}" target="_blank"><img src="${
							item.thumb
						}"/></a><a class="button is-small is-danger is-outlined" title="Delete file" onclick="panel.deleteFile(${
							item.id
						})"><span class="icon is-small"><i class="fa fa-trash-o"></i></span></a>`;
					} else {
						div.innerHTML = `<a href="${item.file}" target="_blank"><h1 class="title">.${item.file
							.split('.')
							.pop()}</h1></a><a class="button is-small is-danger is-outlined" title="Delete file" onclick="panel.deleteFile(${
							item.id
						})"><span class="icon is-small"><i class="fa fa-trash-o"></i></span></a>`;
					}
					table.appendChild(div);
				}
			} else {
				let albumOrUser = 'Album';
				if (panel.username === 'root') albumOrUser = 'User';

				container.innerHTML = `
				${pagination}
				<hr>
				${listType}
				<table class="table is-striped is-narrow is-left">
					<thead>
						<tr>
							  <th>File</th>
							  <th>${albumOrUser}</th>
							  <th>Date</th>
							  <th></th>
						</tr>
					</thead>
					<tbody id="table">
					</tbody>
				</table>
				<hr>
				${pagination}
			`;

				panel.page.appendChild(container);
				const table = document.getElementById('table');

				for (const item of response.data.files) {
					const tr = document.createElement('tr');

					let displayAlbumOrUser = item.album;
					if (panel.username === 'root') {
						displayAlbumOrUser = '';
						if (item.username !== undefined) displayAlbumOrUser = item.username;
					}

					tr.innerHTML = `
					<tr>
						<th><a href="${item.file}" target="_blank">${item.file}</a></th>
						<th>${displayAlbumOrUser}</th>
						<td>${item.date}</td>
						<td>
							<a class="button is-small is-danger is-outlined" title="Delete album" onclick="panel.deleteFile(${item.id})">
								<span class="icon is-small">
									<i class="fa fa-trash-o"></i>
								</span>
							</a>
						</td>
					</tr>
					`;

					table.appendChild(tr);
				}
			}
		})
		.catch(error => {
			return swal(
				'An error ocurred',
				'There was an error with the request, please check the console for more information.',
				'error'
			);
			console.log(error);
		});
};

panel.setFilesView = (view, album, page) => {
	localStorage.filesView = view;
	panel.filesView = view;
	panel.getUploads(album, page);
};

panel.deleteFile = id => {
	swal(
		{
			title: 'Are you sure?',
			text: 'You wont be able to recover the file!',
			type: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#ff3860',
			confirmButtonText: 'Yes, delete it!',
			closeOnConfirm: false
		},
		() => {
			axios
				.post('/api/upload/delete', { id: id })
				.then(response => {
					if (response.data.success === false) {
						if (response.data.description === 'No token provided') return panel.verifyToken(panel.token);
						else return swal('An error ocurred', response.data.description, 'error');
					}

					swal('Deleted!', 'The file has been deleted.', 'success');
					panel.getUploads();
				})
				.catch(error => {
					return swal(
						'An error ocurred',
						'There was an error with the request, please check the console for more information.',
						'error'
					);
					console.log(error);
				});
		}
	);
};

panel.getAlbums = () => {
	axios
		.get('/api/albums')
		.then(response => {
			if (response.data.success === false) {
				if (response.data.description === 'No token provided') return panel.verifyToken(panel.token);
				else return swal('An error ocurred', response.data.description, 'error');
			}

			panel.page.innerHTML = '';
			const container = document.createElement('div');
			container.className = 'container';
			container.innerHTML = `
			<h2 class="subtitle">Create new album</h2>

			<p class="control has-addons has-addons-centered">
				<input id="albumName" class="input" type="text" placeholder="Name">
				<a id="submitAlbum" class="button is-primary">Submit</a>
			</p>

			<h2 class="subtitle">List of albums</h2>

			<table class="table is-striped is-narrow">
				<thead>
					<tr>
						  <th>Name</th>
						  <th>Files</th>
						  <th>Created At</th>
						  <th>Public link</th>
						  <th></th>
					</tr>
				</thead>
				<tbody id="table">
				</tbody>
			</table>`;

			panel.page.appendChild(container);
			const table = document.getElementById('table');

			for (const item of response.data.albums) {
				const tr = document.createElement('tr');
				tr.innerHTML = `
				<tr>
					<th>${item.name}</th>
					<th>${item.files}</th>
					<td>${item.date}</td>
					<td><a href="${item.identifier}" target="_blank">Album link</a></td>
					<td>
						<a class="button is-small is-primary is-outlined" title="Edit name" onclick="panel.renameAlbum(${item.id})">
							<span class="icon is-small">
								<i class="fa fa-pencil"></i>
							</span>
						</a>
						<a class="button is-small is-danger is-outlined" title="Delete album" onclick="panel.deleteAlbum(${item.id})">
							<span class="icon is-small">
								<i class="fa fa-trash-o"></i>
							</span>
						</a>
					</td>
				</tr>
				`;

				table.appendChild(tr);
			}

			document.getElementById('submitAlbum').addEventListener('click', () => {
				panel.submitAlbum();
			});
		})
		.catch(error => {
			return swal(
				'An error ocurred',
				'There was an error with the request, please check the console for more information.',
				'error'
			);
			console.log(error);
		});
};

panel.renameAlbum = id => {
	swal(
		{
			title: 'Rename album',
			text: 'New name you want to give the album:',
			type: 'input',
			showCancelButton: true,
			closeOnConfirm: false,
			animation: 'slide-from-top',
			inputPlaceholder: 'My super album'
		},
		inputValue => {
			if (inputValue === false) return false;
			if (inputValue === '') {
				swal.showInputError('You need to write something!');
				return false;
			}

			axios
				.post('/api/albums/rename', {
					id: id,
					name: inputValue
				})
				.then(response => {
					if (response.data.success === false) {
						if (response.data.description === 'No token provided') { return panel.verifyToken(panel.token); } else if (response.data.description === 'Name already in use') { swal.showInputError('That name is already in use!'); } else { swal('An error ocurred', response.data.description, 'error'); }
						return;
					}

					swal('Success!', `Your album was renamed to: ${inputValue}`, 'success');
					panel.getAlbumsSidebar();
					panel.getAlbums();
				})
				.catch(error => {
					return swal(
						'An error ocurred',
						'There was an error with the request, please check the console for more information.',
						'error'
					);
					console.log(error);
				});
		}
	);
};

panel.deleteAlbum = id => {
	swal(
		{
			title: 'Are you sure?',
			text: "This won't delete your files, only the album!",
			type: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#ff3860',
			confirmButtonText: 'Yes, delete it!',
			closeOnConfirm: false
		},
		() => {
			axios
				.post('/api/albums/delete', { id: id })
				.then(response => {
					if (response.data.success === false) {
						if (response.data.description === 'No token provided') return panel.verifyToken(panel.token);
						else return swal('An error ocurred', response.data.description, 'error');
					}

					swal('Deleted!', 'Your album has been deleted.', 'success');
					panel.getAlbumsSidebar();
					panel.getAlbums();
				})
				.catch(error => {
					return swal(
						'An error ocurred',
						'There was an error with the request, please check the console for more information.',
						'error'
					);
					console.log(error);
				});
		}
	);
};

panel.submitAlbum = () => {
	axios
		.post('/api/albums', { name: document.getElementById('albumName').value })
		.then(response => {
			if (response.data.success === false) {
				if (response.data.description === 'No token provided') return panel.verifyToken(panel.token);
				else return swal('An error ocurred', response.data.description, 'error');
			}

			swal('Woohoo!', 'Album was added successfully', 'success');
			panel.getAlbumsSidebar();
			panel.getAlbums();
		})
		.catch(error => {
			return swal(
				'An error ocurred',
				'There was an error with the request, please check the console for more information.',
				'error'
			);
			console.log(error);
		});
};

panel.getAlbumsSidebar = () => {
	axios
		.get('/api/albums/sidebar')
		.then(response => {
			if (response.data.success === false) {
				if (response.data.description === 'No token provided') return panel.verifyToken(panel.token);
				else return swal('An error ocurred', response.data.description, 'error');
			}

			const albumsContainer = document.getElementById('albumsContainer');
			albumsContainer.innerHTML = '';

			if (response.data.albums === undefined) return;

			for (const album of response.data.albums) {
				li = document.createElement('li');
				a = document.createElement('a');
				a.id = album.id;
				a.innerHTML = album.name;

				a.addEventListener('click', () => {
					panel.getAlbum(this);
				});

				li.appendChild(a);
				albumsContainer.appendChild(li);
			}
		})
		.catch(error => {
			return swal(
				'An error ocurred',
				'There was an error with the request, please check the console for more information.',
				'error'
			);
			console.log(error);
		});
};

panel.getAlbum = item => {
	panel.setActiveMenu(item);
	panel.getUploads(item.id);
};

panel.changeToken = () => {
	axios
		.get('/api/tokens')
		.then(response => {
			if (response.data.success === false) {
				if (response.data.description === 'No token provided') return panel.verifyToken(panel.token);
				else return swal('An error ocurred', response.data.description, 'error');
			}

			panel.page.innerHTML = '';
			const container = document.createElement('div');
			container.className = 'container';
			container.innerHTML = `
			<h2 class="subtitle">Manage your token</h2>

			<label class="label">Your current token:</label>
			<p class="control has-addons">
				<input id="token" readonly class="input is-expanded" type="text" placeholder="Your token" value="${
	response.data.token
}">
				<a id="getNewToken" class="button is-primary">Request new token</a>
			</p>
		`;

			panel.page.appendChild(container);

			document.getElementById('getNewToken').addEventListener('click', () => {
				panel.getNewToken();
			});
		})
		.catch(error => {
			return swal(
				'An error ocurred',
				'There was an error with the request, please check the console for more information.',
				'error'
			);
			console.log(error);
		});
};

panel.getNewToken = () => {
	axios
		.post('/api/tokens/change')
		.then(response => {
			if (response.data.success === false) {
				if (response.data.description === 'No token provided') return panel.verifyToken(panel.token);
				else return swal('An error ocurred', response.data.description, 'error');
			}

			swal(
				{
					title: 'Woohoo!',
					text: 'Your token was changed successfully.',
					type: 'success'
				},
				() => {
					localStorage.token = response.data.token;
					location.reload();
				}
			);
		})
		.catch(error => {
			return swal(
				'An error ocurred',
				'There was an error with the request, please check the console for more information.',
				'error'
			);
			console.log(error);
		});
};

panel.changePassword = () => {
	panel.page.innerHTML = '';
	const container = document.createElement('div');
	container.className = 'container';
	container.innerHTML = `
		<h2 class="subtitle">Change your password</h2>

		<label class="label">New password:</label>
		<p class="control has-addons">
			<input id="password" class="input is-expanded" type="password" placeholder="Your new password">
		</p>
		<label class="label">Confirm password:</label>
		<p class="control has-addons">
			<input id="passwordConfirm" class="input is-expanded" type="password" placeholder="Verify your new password">
			<a id="sendChangePassword" class="button is-primary">Set new password</a>
		</p>
	`;

	panel.page.appendChild(container);

	document.getElementById('sendChangePassword').addEventListener('click', () => {
		if (document.getElementById('password').value === document.getElementById('passwordConfirm').value) {
			panel.sendNewPassword(document.getElementById('password').value);
		} else {
			swal(
				{
					title: 'Password mismatch!',
					text: 'Your passwords do not match, please try again.',
					type: 'error'
				},
				() => {
					panel.changePassword();
				}
			);
		}
	});
};

panel.sendNewPassword = pass => {
	axios
		.post('/api/password/change', { password: pass })
		.then(response => {
			if (response.data.success === false) {
				if (response.data.description === 'No token provided') return panel.verifyToken(panel.token);
				else return swal('An error ocurred', response.data.description, 'error');
			}

			swal(
				{
					title: 'Woohoo!',
					text: 'Your password was changed successfully.',
					type: 'success'
				},
				() => {
					location.reload();
				}
			);
		})
		.catch(error => {
			return swal(
				'An error ocurred',
				'There was an error with the request, please check the console for more information.',
				'error'
			);
			console.log(error);
		});
};

panel.setActiveMenu = item => {
	const menu = document.getElementById('menu');
	const items = menu.getElementsByTagName('a');
	for (const i = 0; i < items.length; i++) items[i].className = '';

	item.className = 'is-active';
};

window.onload = () => {
	panel.preparePage();
};
