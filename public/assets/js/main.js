var app = angular.module("mediaApp",['ngSanitize', 'MassAutoComplete']);

//component to handle async api request
app.factory("DataService", ['$http' , '$q', function($http, $q){
	return {

		getData : function (queryString) {
	        var deferred = $q.defer();
	        $http({
	            method: 'GET',
	            url: "https://www.omdbapi.com/?"+queryString
	        }).
	        success(function (data, status, headers, config) {
	            deferred.resolve(data);
	        }).
	        error(function (error, status, headers, config) {
	            deferred.reject(error);
	        });
	        return deferred.promise;
	    },

	    getMovieTitles : function(searchKeyword) {
			var deferred = $q.defer();
			var result = [];
		    if(searchKeyword.length >= 2){
			    var queryString = "s="+searchKeyword;
				$http({
		            method: 'GET',
		            url: "https://www.omdbapi.com/?"+queryString
		        })
		        .success(function (data, status, headers, config) {
		            if(data.Response === "True" && data.Search && data.Search.length){
						for(i = 0; i < data.Search.length; i++){
							result.push({label: data.Search[i].Title, value:data.Search[i].Title});
						}
					}
					deferred.resolve(result);
		        })
		        .error(function (error, status, headers, config) {
		            deferred.reject(error);
		        });
			}else{
				deferred.resolve(result);
			}
			return deferred.promise;
		}
	};
}]);

app.directive('rating', function () {
    return {
        restrict: 'A',
        template: '<ul class="rating">' +
            '<li ng-repeat="star in stars" ng-class="star">' +
            '\u2605' +
            '</li>' +
            '</ul>',
        scope: {
            ratingValue: '=',
            max: '='
        },
        link: function (scope, elem, attrs) {
            scope.stars = [];
            for (var i = 0; i < scope.max; i++) {
                scope.stars.push({
                    filled: i < scope.ratingValue
                });
            }
        }
    }
});

app.filter('roundRating', function() {
    return function(input) {
		var rating = parseInt(input, 10);
		return Math.round((rating / 2));
    };
});

app.service("Genre",function(){
	var genreFilter = "All";

	this.setGenre = function(filterkeyword){
		genreFilter = filterkeyword;
	};

	this.getSelectedGenre = function(){
		return genreFilter;
	};
});

app.filter("filterByGenre", ["Genre", function(Genre){
	return function(movies){
		var genre = Genre.getSelectedGenre();
		if(genre === "All"){
			return movies;
		}else if(genre && movies && movies.length > 0){
			var moviesFilter = [];
			movies.forEach(function(value){
				if(value.Genre.includes(genre)){
					moviesFilter.push(value);
				}
			});
			return moviesFilter;
		}else{
			return [];
		}
	};
}]);

//component for only for search
app.controller("SearchCtrl", ["$rootScope", "$scope", "$q", "DataService", "Genre", function($rootScope, $scope, $q, DataService, Genre){
	
	$scope.dirty = {};
	
	$scope.autocompleteOptions = {
	    suggest: DataService.getMovieTitles
  	};

	$scope.clearValue = function(){
		$scope.dirty.keyword = '';
	}

	$scope.search = function(keyword, event){

		if(event.which === 13){
			var queryString = "s="+keyword;
			DataService.getData(queryString)
			.then(function(data, status){
				var imdbIDs = [];
				if(data.Response === "True" && data.Search && data.Search.length){
					data.Search.forEach(function(value){
						imdbIDs.push(value.imdbID);
					});
					$rootScope.$broadcast("handleSearch", keyword, imdbIDs, $scope.genre);
				}
			}, function(error, status){
				console.log(error);
			});
		}
	};

	$scope.filterByGenre = function(genre){
		angular.element(".selectpicker .active").removeClass('active');
		angular.element(".selectpicker img").addClass('hideArrow');
		angular.element(event.target).addClass('active');
		angular.element(".active img").removeClass('hideArrow').addClass('showArrow');
		Genre.setGenre(genre);
	};

}]);

//component related to movies separated from search
app.controller("MovieCtrl", ["$scope", "DataService", "$q", function($scope, DataService, $q){
	var persistKeyword;

	$scope.showLoading = false;

	var successHandler = function(keyword, data){
		$scope.showLoading = false;
		if(window.localStorage){
			localStorage.setItem(keyword, JSON.stringify(data));
		}
		$scope.movieList = data;
	};

	var failureHanlder = function(error){
		console.error("Error occurred", error);
	};

	$scope.$on("handleSearch", function(event, keyword, imdbIDs){
		$scope.showLoading = true;
		$scope.movieList = [];
		persistKeyword = keyword;
		if(window.localStorage && (localStorage.getItem(keyword) === null || localStorage.getItem(keyword) === undefined)){
			var promises = [];
			imdbIDs.forEach(function(imdbId){
				promises.push(DataService.getData("i="+imdbId));
			});
			$q.all(promises).then(successHandler.bind(null, keyword), failureHanlder);
		}else if(window.localStorage){
			$scope.showLoading = false;
			$scope.movieList = JSON.parse(localStorage.getItem(keyword));
		}
	});

	$scope.editMovie = function(movie){
		$scope.movieDetail = movie;
	};

	$scope.saveMovie = function(movieDetails){
		angular.element('#editMoviedetails').modal('hide');
		var localStore = JSON.parse(localStorage.getItem(persistKeyword))
		localStore.forEach(function(value){
			if(value.Title === movieDetails.Title){
				value.Year = movieDetails.Year;
				value.Genre = movieDetails.Genre;
				value.Director = movieDetails.Director;
				value.Actors = movieDetails.Actors;
				value.Plot = movieDetails.Plot;
				value.imdbRating = movieDetails.imdbRating;
			}
		});
		localStorage.setItem(persistKeyword, JSON.stringify(localStore));
	};

}]);

