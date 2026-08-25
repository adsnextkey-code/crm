const store = require('../store');

const PERIODS = ['Weekly', 'Monthly'];
const MAX_FILE_CHARS = 2700000;

const createReport = (data = {}) => {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title) throw Object.assign(new Error('Report title is required'), { name: 'ValidationError' });
  if (!PERIODS.includes(data.period)) throw Object.assign(new Error('Period must be Weekly or Monthly'), { name: 'ValidationError' });

  return store.insert('reports', {
    clientId: String(data.clientId),
    title,
    period: data.period,
    note: typeof data.note === 'string' ? data.note.trim() : '',
    fileName: data.fileName || '',
    fileType: data.fileType || '',
    fileSize: Number(data.fileSize) || 0,
    fileData: data.fileData || '',
    createdBy: data.createdBy,
    createdByName: data.createdByName
  });
};

const listReports = (clientId) =>
  store
    .find('reports', (r) => String(r.clientId) === String(clientId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

const findById = (id) => store.findById('reports', id);

const deleteReport = (id) => store.delete('reports', id);

module.exports = { createReport, listReports, findById, deleteReport, PERIODS, MAX_FILE_CHARS };
