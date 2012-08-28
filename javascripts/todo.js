function todoViewModel() {
    var self = this,
        mobileServiceClient = new MobileServiceClient("http://stevequickstart.azure-mobile.net/", "lissECLqgtkVNHbjgGejMvnJVbDFxB94"),
        todoItemTable = mobileServiceClient.getTable("TodoItem");

    this.todoItems = ko.observableArray();
    this.isLoggedIn = ko.observable(false);
    this.itemToAdd = ko.observable();

    this.refreshData = function() {
        todoItemTable.read({ complete: false }).done(this.todoItems).fail(function(xhr, textStatus, message) {
            alert(["Fail", message, xhr.status]);
        });
    };

    this.addItem = function() {
        var newTodo = { text: this.itemToAdd(), complete: false };
        this.todoItems.push(newTodo);  // Add on client
        todoItemTable.insert(newTodo); // Add on server
        this.itemToAdd("");
    };

    this.markComplete = function(todoItem) {
        todoItem.complete = true;
        this.todoItems.remove(todoItem); // Remove on client
        todoItemTable.update(todoItem);  // Persist on server
    };

    // On login, fetch data
    mobileServiceClient.auth.init({ 
        clientId: "00000000400D5C25",
        onLogin: function() { self.isLoggedIn(true); self.refreshData(); },
        onLogout: function() { self.isLoggedIn(false); self.todoItems([]); }
    });

    // Handle checkboxes being checked
    $("ul").on("click", "[type=checkbox]", function() {
        self.markComplete(ko.dataFor(this));
    });
}

$(function() {
    ko.applyBindings(new todoViewModel());
    WL.ui({ name: "signin", element: "signInButton", brand: "none" });
});