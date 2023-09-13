const path = require('path');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { unlink } = require('fs/promises');

const storage = multer.diskStorage({
	destination: function(_, _, cb){
		cb(null, 'public/images')
	},
	filename: function(_, file, cb){
		cb(null, file.fieldname + '-' + Date.now() + '.' + file.mimetype.split('/')[1] )
	}
})

const fileFilter = (_, file, callback) => {
	const ext = path.extname(file.originalname);
  const isImage = ['.png', '.jpg', '.jpeg'].some(imgExt => imgExt === ext)

	if (!isImage){
    return callback(new Error('Only png and jpg files are accepted'))
	}

  return callback(null, true)
}

const upload = multer({ storage, fileFilter });

router.get('/', (req, res) => {
  const images = req.session.imagefiles

	if (images === undefined){
		res.sendFile(path.join(__dirname, '../public/html/index.html'));
    return
	}

  res.render('index', { images } )
});

router.post('/upload', upload.array('images'), (req, res) => {
	if (req.files.length === 0) {
		res.redirect('/')
    return
	}

  const files = req.files;
  const imgNames = [];

  for(let i of files){
    const index = Object.keys(i).findIndex(e => e === 'filename')
    imgNames.push( Object.values(i)[index] )
  }

  req.session.imagefiles = imgNames
  res.redirect('/')
})

router.post('/pdf', function(req, res) {
	const body = req.body

	const doc = new PDFDocument({ size: 'A4', autoFirstPage: false });
	const pdfName = 'pdf-' + Date.now() + '.pdf';

	doc.pipe(fs.createWriteStream(path.join(__dirname, `../public/pdf/${pdfName}`)));

	for(let name of body){
		doc.addPage()
		doc.image(path.join(__dirname, `../public/images/${name}`),20, 20, { width: 555.28, align: 'center', valign: 'center' } )
	}

	doc.end();

	res.send(`/pdf/${pdfName}`)
})

router.get('/new', function(req, res) {
	const filenames = req.session.imagefiles;

	const deleteFiles = async (paths) => {
		const deleting = paths.map((file) => unlink(path.join(__dirname, `../public/images/${file}`)))
		await Promise.all(deleting)
	}

	deleteFiles(filenames)
	req.session.imagefiles = undefined

	res.redirect('/')
})

module.exports = router;