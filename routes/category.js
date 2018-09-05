var express = require('express');
var router = express.Router();

var slug = require('slug');
var multer  = require('multer');
var mime = require('mime');
var moment = require('moment');
var Jimp = require("jimp");


var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/')
  },
  filename: function (req, file, cb) {
    var fileName = Date.now() + slug(file.originalname) +'.'+ mime.extension(file.mimetype);
    cb(null, fileName);
  }
});

var upload = multer({ storage: storage });
var cpUpload = upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'catalog', maxCount: 5 }, { name: 'gallery', maxCount: 30 }])


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/category/edit/:id', function(req, res, next){
	var category = Category.findOne({
	  _id: req.params.id
	});
	Promise.all([category]).then(values => {
	    console.log(values);
	    res.render('admin/editcategory', {
	        title: "Edit "+values[0].name,
	        category: values[0],
          categoryjson: JSON.stringify(values[0]),
	    });
	  });
});

router.get('/category/showhome/:id', function(req, res, next){
	Category.findById(req.params.id)
	.then(function(b){
		if(b.approved == "true"){
			b.approved = "false";
		}else{
			b.approved = "true";
		}

		b.save(function(err){
			if(err)
				res.redirect('/admin/category');
			res.redirect('/admin/category');
		});
	})
	.catch(function(err){
	     console.log(err);
	});
});

router.get('/subcategory/delete/:id/:name', function(req, res, next){
		Category.update(
			{_id: req.params.id},
			{ $pull: { subcategories: { name: req.params.name} }
    	})
		.then(function(data){
		    res.redirect('/admin/category');
		})
		.catch(function(err){
		     console.log(err);
		});
});

router.post('/category/update/:id',  cpUpload, function(req, res, next){
	var category = Category.findOne({
	  _id: req.params.id
	}).then(function(data){
		data.name = req.body.name;
    data.slug = slug(req.body.name);
		data.icon = req.body.icon;
		data.order = req.body.order;
    data.group = req.body.group;
    if (req.files['photo'] != null){
  		data.photo = req.files['photo'][0].filename;
  	}
		data.save(function(err){
			if(err){
        req.flash("error", err);
				res.redirect('/admin/category');
      }
      if (req.files['photo'] != null){
  				Jimp.read("./public/uploads/category/"+data.photo).then(function (cover) {
  				    return cover.resize(200, 150)     // resize
  				         .quality(100)              // set greyscale
  				         .write("./public/uploads/thumbs/categories/"+data.photo); // save
  				}).catch(function (err) {
  				    console.error(err);
  				});
  			}else{

  			}
        req.flash("success_msg", "Category Successfully Edited");
			res.redirect('/admin/category');
		});
	});

});


router.get('/category/add', function(req, res, next){
	res.render('admin/addcategory');
});

router.get('/category/delete/:id',  function(req, res, next){
	Category.deleteOne({
		_id: req.params.id
	})
	  .then(function(data){
	    res.redirect('/admin/category');
	  })
	  .catch(function(err){
	     console.log(err);
	  });
});

router.post('/category/add', cpUpload, function(req, res, next){
  var i = new Category();
	i.name = req.body.name;
  i.slug = slug(req.body.name);
	i.icon = req.body.icon;
	i.order = req.body.order;
  i.group = req.body.group;
  if (req.files['photo'] != null){
		i.photo = req.files['photo'][0].filename;
	}
	i.save(function(err){
		if(err)
			res.render('admin/addcategory');
    if (req.files['photo'] != null){
				Jimp.read("./public/uploads/category/"+i.photo).then(function (cover) {
				    return cover.resize(200, 150)     // resize
				         .quality(100)              // set greyscale
				         .write("./public/uploads/thumbs/categories/"+i.photo); // save
				}).catch(function (err) {
				    console.error(err);
				});
			}else{
				req.flash("success_msg", "Category Successfully Created");
			}
		res.redirect('/admin/category');
	});
});

router.get('/subcategory', function(req, res, next) {
  Subcategory.find({})
  .then(function(data){
  	console.log(data);
    res.render('admin/subcategory', {title: "Find It Categories", subcategories: data});
  })
  .catch(function(err){
     console.log(err);
  });
});

router.get('/subcategory/add', function(req, res, next){
	Category.find({group:'general'})
	.then(function(data){
	  	console.log(data);
	    res.render('admin/addsubcategory',{title: "Find It Categories", categories: data});
	})
	.catch(function(err){
	     console.log(err);
	});
});

router.post('/subcategory/add', function(req, res, next){
	Category.findById(req.body.category).then(function(cat){
		cat.subcategories.push({name: req.body.name});
		//console.log(cat);
		cat.save(function(err){
			if(err){
				console.log(err);
				res.render('admin/addcategory');
			}
			res.redirect('/admin/category');
		});
	});
});


module.exports = router;