
module.exports = {
	// Configuring the HTTP server
	server_port: 3000,
	server_host: 'localhost',
	// Database
	connection_string: 'postgresql://netico:test@localhost:5432/development',
	modules: {
		orders: {
			query: '',
			title: 'Orders'
		},
		customers: {
			query: '',
			title: 'Customers'
		}
	}

}
