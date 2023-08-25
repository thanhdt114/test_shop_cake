
module.exports = function(model, page, itemsPerPage) {
    const resPerPage = Number(itemsPerPage) || 10;
    const currentPage = Number(page) || 1;
    const skip = resPerPage * (currentPage - 1);

    model = model.limit(resPerPage).skip(skip);
    return model;
}

