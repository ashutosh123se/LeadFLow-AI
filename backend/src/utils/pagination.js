const getPagination = (page, limit) => {
  const parsedPage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  const parsedLimit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;
  const skip = (parsedPage - 1) * parsedLimit;

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip,
  };
};

const getPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
  };
};

module.exports = {
  getPagination,
  getPaginationMeta,
};
