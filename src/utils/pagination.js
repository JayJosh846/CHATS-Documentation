class Pagination {
  static async getPagination(page, size) {
    const limit = size ? +size : 10;
    const offset = limit * (page - 1);

    return {limit, offset};
  }
  static async getPagingData(details, page, limit) {
    const {count: totalItems, rows: data} = details;
    const currentPage = page ? +page : 0;
    const totalPages = Math.ceil(totalItems / limit);
    return {totalItems, data, totalPages, currentPage};
  }
}
module.exports = Pagination;
