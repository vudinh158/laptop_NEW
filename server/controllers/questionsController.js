// Questions Management Controller
const { Question, Answer, User, Product } = require("../models")
const { Op } = require("sequelize")

exports.getAllQuestions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, answered, has_product, sort_by = 'created_at', sort_order = 'DESC' } = req.query
    const offset = (page - 1) * limit
    const where = {}

    if (answered === 'true') where.is_answered = true
    else if (answered === 'false') where.is_answered = false

    if (has_product === 'true') where.product_id = { [Op.ne]: null }
    else if (has_product === 'false') where.product_id = null

    const allowedSortFields = ['created_at', 'updated_at', 'question_id']
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at'
    const sortOrder = ['ASC', 'DESC'].includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC'

    const { count, rows } = await Question.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'username', 'full_name', 'email'] },
        { model: Product, as: 'product', attributes: ['product_id', 'product_name'], required: false },
        { model: Answer, as: 'answers', attributes: ['answer_id', 'answer_text', 'created_at'],
          include: [{ model: User, as: 'user', attributes: ['user_id', 'username', 'full_name'] }],
          required: false }
      ],
      limit: parseInt(limit), offset: parseInt(offset),
      order: [[sortField, sortOrder], ['created_at', 'DESC']]
    })

    res.json({ questions: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } })
  } catch (error) { next(error) }
}

exports.getQuestionDetail = async (req, res, next) => {
  try {
    const { question_id } = req.params
    const question = await Question.findByPk(question_id, {
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'username', 'full_name', 'email'] },
        { model: Product, as: 'product', attributes: ['product_id', 'product_name'] },
        { model: Answer, as: 'answers', attributes: ['answer_id', 'answer_text', 'created_at', 'updated_at'],
          include: [{ model: User, as: 'user', attributes: ['user_id', 'username', 'full_name'] }],
          order: [['created_at', 'ASC']] }
      ]
    })

    if (!question) return res.status(404).json({ message: 'Question not found' })
    res.json({ question })
  } catch (error) { next(error) }
}

exports.createAnswer = async (req, res, next) => {
  try {
    const { question_id } = req.params
    const { answer_text } = req.body
    const adminUser = req.user

    if (!answer_text || answer_text.trim().length === 0) {
      return res.status(400).json({ message: 'Answer text is required' })
    }

    const question = await Question.findByPk(question_id)
    if (!question) return res.status(404).json({ message: 'Question not found' })

    const answer = await Answer.create({
      question_id: question_id, user_id: adminUser.user_id, answer_text: answer_text.trim()
    })

    await question.update({ is_answered: true })

    const answerWithUser = await Answer.findByPk(answer.answer_id, {
      include: [{ model: User, as: 'user', attributes: ['user_id', 'username', 'full_name'] }]
    })

    res.status(201).json({ message: 'Answer created successfully', answer: answerWithUser })
  } catch (error) { next(error) }
}

exports.updateAnswer = async (req, res, next) => {
  try {
    const { question_id, answer_id } = req.params
    const { answer_text } = req.body

    if (!answer_text || answer_text.trim().length === 0) {
      return res.status(400).json({ message: 'Answer text is required' })
    }

    const answer = await Answer.findOne({ where: { answer_id: answer_id, question_id: question_id } })
    if (!answer) return res.status(404).json({ message: 'Answer not found' })

    await answer.update({ answer_text: answer_text.trim() })
    res.json({ message: 'Answer updated successfully', answer })
  } catch (error) { next(error) }
}

exports.deleteAnswer = async (req, res, next) => {
  try {
    const { question_id, answer_id } = req.params

    const answer = await Answer.findOne({ where: { answer_id: answer_id, question_id: question_id } })
    if (!answer) return res.status(404).json({ message: 'Answer not found' })

    await answer.destroy()

    const remainingAnswers = await Answer.count({ where: { question_id: question_id } })
    if (remainingAnswers === 0) {
      await Question.update({ is_answered: false }, { where: { question_id: question_id } })
    }

    res.json({ message: 'Answer deleted successfully' })
  } catch (error) { next(error) }
}

