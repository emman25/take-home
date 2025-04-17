export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  regexPattern: process.env.REGEX_PATTERN || '^[a-zA-Z0-9\\s]+$',
  validationDelayMs: parseInt(process.env.VALIDATION_DELAY_MS || '5000', 10),
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'regex-validator-backend',
    groupId: process.env.KAFKA_GROUP_ID || 'regex-validator-group',
    jobSubmitTopic: process.env.KAFKA_JOB_SUBMIT_TOPIC || 'job.submitted',
    jobUpdateTopic: process.env.KAFKA_JOB_UPDATE_TOPIC || 'job.updated',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/regexValidator',
  },
  redis: {
    host: process.env.REDIS_HOST || 'redis_take_home',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    jobChannel: process.env.REDIS_JOB_CHANNEL || 'job-updates',
  },
});
